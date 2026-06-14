import os
import sys
import re
import subprocess
import json
import shutil
import asyncio
import random

# 自動安裝 edge-tts 依賴
try:
    import edge_tts
except ImportError:
    print("正在安裝 edge-tts 依賴套件...")
    subprocess.run([sys.executable, "-m", "pip", "install", "edge-tts"], check=True)
    import edge_tts

# 檢查 ffprobe 是否可用
def check_ffprobe():
    try:
        subprocess.run(["ffprobe", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except FileNotFoundError:
        return False

# 使用 ffprobe 獲取 MP3 時長
def get_audio_duration(file_path):
    cmd = [
        "ffprobe", 
        "-v", "error", 
        "-show_entries", "format=duration", 
        "-of", "default=noprint_wrappers=1:nokey=1", 
        file_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(result.stdout.strip())

# XML 特殊字元跳脫，防止 SSML 格式錯誤
def xml_escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")


# 異步合成 TTS 語音 (含重試與防限流機制)
async def generate_tts(text, voice, output_path):
    max_retries = 5
    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)
            # 成功生成後，延遲 3.0~4.5 秒的隨機抖動延遲，徹底防止微軟限流封鎖
            await asyncio.sleep(3.0 + random.random() * 1.5)
            return
        except Exception as e:
            print(f"    [TTS] 語音生成失敗 (嘗試 {attempt+1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                raise e
            # 失敗後，多休息 8.0 秒，給伺服器釋放連接
            await asyncio.sleep(8.0)


# 角色與聲音的靜態對應
CHARACTER_VOICES = {
    "小螺": "zh-TW-YunJheNeural",    # 活潑男聲
    "菩菩": "zh-TW-HsiaoChenNeural",   # 溫柔女聲
}

# 根據角色名稱分配聲音的邏輯
def get_voice_for_char(char_name):
    char_name = char_name.strip()
    if char_name in CHARACTER_VOICES:
        return CHARACTER_VOICES[char_name]
    
    # 根據關鍵字智能指派聲音
    female_keywords = ["姐", "妹", "娘", "女", "媽", "婆", "菩", "妃", "后", "音", "陳", "雨", "美", "妮", "娜"]
    if any(k in char_name for k in female_keywords):
        return "zh-TW-HsiaoChenNeural"
    
    male_keywords = ["叔", "伯", "公", "爺", "男", "螺", "佛", "僧", "弟", "哥", "哲", "賢", "父", "祖", "郎"]
    if any(k in char_name for k in male_keywords):
        return "zh-TW-YunJheNeural"
    
    # 預設使用流暢女聲
    return "zh-TW-HsiaoYuNeural"


# 使用 FFmpeg 合併多個音訊檔，確保無縫銜接
def merge_audio_files(input_paths, output_path):
    if not input_paths:
        return
    if len(input_paths) == 1:
        shutil.copy2(input_paths[0], output_path)
        return
    
    # 構建 ffmpeg filter_complex 指令
    cmd = ["ffmpeg", "-y"]
    for path in input_paths:
        cmd.extend(["-i", path])
    
    filter_str = "".join(f"[{i}:a]" for i in range(len(input_paths)))
    filter_str += f"concat=n={len(input_paths)}:v=0:a=1[a]"
    
    cmd.extend([
        "-filter_complex", filter_str,
        "-map", "[a]",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        output_path
    ])
    
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


# 解析 script.txt
def parse_script(script_path):
    if not os.path.exists(script_path):
        example_content = """# https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1280&q=80
[animation: zoom-in, pan: right-to-left]
[transition: morph]
[object: main-title, type: text, content: "Puti-AI 簡報生成器", x: 50, y: 35, size: 64, color: "#ffffff", entrance: pop-in]
[object: sub-title, type: text, content: "最強簡報影片自動化神器", x: 50, y: 55, size: 32, color: "#ffcc00", entrance: fade-in]
歡迎來到 Puti-AI 自動簡報影片生成器！這是一個非常強大的影片製作工具。
"""
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(example_content)
        print(f"已自動生成範例腳本：{script_path}")
    
    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    slides = []
    custom_voices = {}
    bgm_config = {"file": None, "volume": 0.18} # 預設背景音樂音量 18%
    
    # 1. 將全域配置與投影片主體分割 (以第一個 '#' 字元為分界)
    first_sharp_idx = content.find("#")
    if first_sharp_idx != -1:
        global_part = content[:first_sharp_idx]
        slides_part = content[first_sharp_idx:]
    else:
        global_part = content
        slides_part = ""
        
    # 2. 解析全域配置
    for line in global_part.split('\n'):
        line_str = line.strip()
        if not line_str:
            continue
            
        # 解析背景音樂宣告 [bgm: 音樂檔案, volume: 播放音量]
        bgm_match = re.match(r'\[bgm:\s*([^\s,\]]+),\s*volume:\s*([^\s,\]]+)\]', line_str)
        if bgm_match:
            bgm_config["file"] = bgm_match.group(1).strip()
            bgm_config["volume"] = float(bgm_match.group(2).strip())
            continue
        
        # 解析自訂角色聲音宣告 [voice: 角色名字, voice_name: 聲音代碼]
        voice_match = re.match(r'\[voice:\s*([^\s,\]]+),\s*voice_name:\s*([^\s,\]]+)\]', line_str)
        if voice_match:
            char_name = voice_match.group(1).strip()
            voice_name = voice_match.group(2).strip()
            custom_voices[char_name] = voice_name
            continue
            
    # 3. 解析每張投影片
    if slides_part:
        # 移除第一個 '#' 之後，依據行首 '#' 切分每個區塊
        blocks = re.split(r'^#\s*', slides_part, flags=re.MULTILINE)
        for block in blocks:
            if not block.strip():
                continue
            
            lines = block.strip().split('\n')
            image_name = lines[0].strip()
            
            animation_type = "none"
            pan_direction = "none"
            transition_type = "fade"
            subtitle = ""
            objects = []
            
            script_text_lines = []
            for line in lines[1:]:
                line_str = line.strip()
                if not line_str:
                    continue
                
                anim_match = re.match(r'\[animation:\s*([a-zA-Z\-]+),\s*pan:\s*([a-zA-Z\-]+)\]', line_str)
                if anim_match:
                    animation_type = anim_match.group(1)
                    pan_direction = anim_match.group(2)
                    continue
                    
                trans_match = re.match(r'\[transition:\s*([a-zA-Z\-]+)\]', line_str)
                if trans_match:
                    transition_type = trans_match.group(1)
                    continue
     
                obj_match = re.match(r'\[object:\s*([a-zA-Z0-9\-]+),\s*(.*)\]', line_str)
                if obj_match:
                    obj_id = obj_match.group(1)
                    attrs_str = obj_match.group(2)
                    attrs = {}
                    for attr_m in re.finditer(r'\s*([a-zA-Z0-9\-]+)\s*:\s*(?:"([^"]*)"|([^\s,]+))', attrs_str):
                        key = attr_m.group(1)
                        val = attr_m.group(2) if attr_m.group(2) is not None else attr_m.group(3)
                        try:
                            if '.' in val:
                                val = float(val)
                            else:
                                val = int(val)
                        except ValueError:
                            pass
                        attrs[key] = val
                    
                    attrs["id"] = obj_id
                    objects.append(attrs)
                    continue
                    
                script_text_lines.append(line_str)
                
            subtitle = " ".join(script_text_lines)
            
            slides.append({
                "image": image_name,
                "animation": {
                    "type": animation_type,
                    "pan": pan_direction
                },
                "transition": {
                    "type": transition_type
                },
                "objects": objects,
                "subtitle": subtitle
            })
            
    return slides, custom_voices, bgm_config
 
async def main():
    if not check_ffprobe():
        print("錯誤：系統中未找到 ffprobe，請確保 FFmpeg 已安裝並加入環境變數 PATH 中。")
        sys.exit(1)
        
    target_dir = "."
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
        
    if not os.path.exists(target_dir):
        print(f"錯誤：找不到指定的資料夾：{target_dir}")
        sys.exit(1)
        
    target_dir_abs = os.path.abspath(target_dir)
    target_dir_name = os.path.basename(target_dir_abs) if target_dir != "." else "root"
    
    script_file = os.path.join(target_dir_abs, "script.txt")
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(root_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    
    print(f"步驟 1: 解析 {script_file} 腳本...")
    slides, custom_voices, bgm_config = parse_script(script_file)
    CHARACTER_VOICES.update(custom_voices)
    
    # 複製自訂 BGM 背景音樂
    bgm_filename = None
    if bgm_config["file"]:
        bgm_local_path = os.path.join(target_dir_abs, bgm_config["file"])
        if os.path.exists(bgm_local_path):
            bgm_filename = f"bgm_{target_dir_name}_{bgm_config['file']}"
            dest_bgm_path = os.path.join(public_dir, bgm_filename)
            shutil.copy2(bgm_local_path, dest_bgm_path)
            print(f"  -> 已成功載入並複製背景音樂：{bgm_config['file']}")
        else:
            print(f"  警告：找不到背景音樂檔案 {bgm_local_path}")
            
    print("步驟 2: 處理資源（複製本地圖片與配音）...")
    for i, slide in enumerate(slides):
        # 1. 處理投影片圖片
        img_src = slide["image"]
        if not img_src.startswith("http"):
            local_img_path = os.path.join(target_dir_abs, img_src)
            if not os.path.exists(local_img_path):
                print(f"  警告：找不到本地圖片 {local_img_path}")
            else:
                dest_filename = f"{target_dir_name}_{img_src}"
                dest_path = os.path.join(public_dir, dest_filename)
                shutil.copy2(local_img_path, dest_path)
                slide["image"] = dest_filename
                
        # 3. 處理 TTS 語音
        audio_filename = f"audio_{target_dir_name}_{i+1}.mp3"
        audio_path = os.path.join(public_dir, audio_filename)
        
        text = slide["subtitle"]
        if not text:
            text = " "
            
        # 匹配：角色：「對白」
        dialogues = re.findall(r"([^：「」\s]+)：「([^」]+)」", text)
        
        if dialogues:
            # 對話型投影片：分句合成再拼接
            temp_files = []
            cleaned_subtitles = []
            for idx, (char, content) in enumerate(dialogues):
                voice = get_voice_for_char(char)
                temp_filename = f"temp_slide_{i+1}_{idx}.mp3"
                temp_path = os.path.join(public_dir, temp_filename)
                
                print(f"  -> 生成 [對話] {char} (使用 {voice}): '{content[:12]}...'")
                await generate_tts(content, voice, temp_path)
                temp_files.append(temp_path)
                cleaned_subtitles.append(f"「{content}」")
            
            # 合併語音檔
            merge_audio_files(temp_files, audio_path)
            
            # 刪除臨時檔案
            for f_path in temp_files:
                if os.path.exists(f_path):
                    try:
                        os.remove(f_path)
                    except Exception:
                        pass
                        
            # 字幕只留乾淨的台詞引號，去掉人名
            slide["subtitle"] = "".join(cleaned_subtitles)
        else:
            # 旁白型投影片：使用預設聲音
            voice = "zh-TW-HsiaoChenNeural"
            print(f"  -> 生成 [旁白] (使用 {voice}): '{text[:15]}...'")
            await generate_tts(text, voice, audio_path)
        
        duration = get_audio_duration(audio_path)
        slide["durationInSeconds"] = duration + 0.4
        slide["audio"] = audio_filename
        
    input_data = {
      "settings": {
        "width": 1280,
        "height": 720,
        "fps": 30,
        "bgm": bgm_filename,
        "bgmVolume": bgm_config["volume"]
      },
      "slides": slides
    }
    
    input_json_path = os.path.join(root_dir, "input.json")
    with open(input_json_path, "w", encoding="utf-8") as f:
        json.dump(input_data, f, ensure_ascii=False, indent=2)
    print("步驟 3: 已生成 input.json 配置檔！")
    
    print("步驟 4: 呼叫 Remotion 渲染影片...")
    subprocess.run(["npm", "run", "render"], shell=True, check=True, cwd=root_dir)
    
    src_mp4 = os.path.join(root_dir, "out.mp4")
    dest_mp4 = os.path.join(target_dir_abs, "out.mp4")
    if os.path.exists(src_mp4):
        if os.path.exists(dest_mp4):
            os.remove(dest_mp4)
        shutil.move(src_mp4, dest_mp4)
        print(f"影片生成成功！已儲存於：{dest_mp4}")
    else:
        print("錯誤：找不到渲染後的影片 out.mp4 檔案")

if __name__ == "__main__":
    asyncio.run(main())
