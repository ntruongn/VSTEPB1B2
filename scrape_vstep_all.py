import asyncio
import os
import json
import re
import argparse
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

CDP_URL = "http://localhost:9222"
DATA_DIR = os.path.abspath("./extracted_data")

# Setup output folders
for cat in ["reading", "listening", "writing", "speaking"]:
    os.makedirs(os.path.join(DATA_DIR, cat), exist_ok=True)

def clean_text(text):
    if not text:
        return ""
    return re.sub(r'\n+', '\n', text).strip()

def parse_reading_results(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Title
    title_span = soup.find("span", class_="fw-bold text-muted small d-block")
    title = title_span.get_text(strip=True) if title_span else "Unknown Reading Test"
    
    # English Passage
    passage_card = soup.select_one(".row.mt-4 .col-md-6:first-child .card")
    if not passage_card:
        passage_card = soup.select_one(".panel-left .card") or soup.select_one(".card")
    passage_body = passage_card.select_one(".card-body") if passage_card else None
    passage_text = passage_body.get_text("\n", strip=True) if passage_body else ""
    
    # Vietnamese Translation
    translation_div = soup.find("div", id="offcanvasTranslation")
    translation_body = translation_div.find("div", class_="offcanvas-body") if translation_div else None
    translation_text = translation_body.get_text("\n", strip=True) if translation_body else ""
    
    # Questions
    questions = []
    question_blocks = soup.find_all("div", class_="question-block")
    for block in question_blocks:
        q_id = block.get("id", "")
        q_header = block.find("div", class_="fw-bold mb-2")
        if not q_header:
            continue
        q_text = q_header.get_text(strip=True)
        
        # Options
        options = []
        correct_answer = None
        choice_divs = block.select(".ps-4.mb-2") or block.select(".form-check")
        for opt_div in choice_divs:
            opt_text = opt_div.get_text(strip=True)
            options.append(opt_text)
            if opt_div.find(class_="text-success") or "text-success" in opt_div.get("class", []):
                correct_answer = opt_text
        
        # Explanation
        explanation_div = block.select_one(".mt-4")
        explanation_text = explanation_div.get_text("\n", strip=True) if explanation_div else ""
        
        questions.append({
            "id": q_id,
            "question": q_text,
            "options": options,
            "correct_answer": correct_answer,
            "explanation": explanation_text
        })
        
    return {
        "title": title,
        "passage": passage_text,
        "translation": translation_text,
        "questions": questions
    }

def parse_listening_results(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Title
    title_span = soup.find("span", class_="fw-bold text-muted small d-block")
    title = title_span.get_text(strip=True) if title_span else "Unknown Listening Test"
    
    # Audio Source
    audio = soup.find("audio")
    audio_url = ""
    if audio:
        audio_url = audio.get("src") or ""
        if not audio_url:
            source = audio.find("source")
            if source:
                audio_url = source.get("src") or ""
                
    # Transcript
    transcript_div = soup.find("div", id="offcanvasTranscript")
    transcript_body = transcript_div.find("div", class_="offcanvas-body") if transcript_div else None
    transcript_text = transcript_body.get_text("\n", strip=True) if transcript_body else ""
    
    # Vietnamese Translation
    translation_div = soup.find("div", id="offcanvasTranslation")
    translation_body = translation_div.find("div", class_="offcanvas-body") if translation_div else None
    translation_text = translation_body.get_text("\n", strip=True) if translation_body else ""
    
    # Questions
    questions = []
    question_blocks = soup.find_all("div", class_="question-block")
    for block in question_blocks:
        q_id = block.get("id", "")
        q_header = block.find("div", class_="fw-bold mb-2")
        if not q_header:
            continue
        q_text = q_header.get_text(strip=True)
        
        # Options
        options = []
        correct_answer = None
        choice_divs = block.select(".ps-4.mb-2") or block.select(".form-check")
        for opt_div in choice_divs:
            opt_text = opt_div.get_text(strip=True)
            options.append(opt_text)
            if opt_div.find(class_="text-success") or "text-success" in opt_div.get("class", []):
                correct_answer = opt_text
                
        # Explanation
        explanation_div = block.select_one(".mt-4")
        explanation_text = explanation_div.get_text("\n", strip=True) if explanation_div else ""
        
        questions.append({
            "id": q_id,
            "question": q_text,
            "options": options,
            "correct_answer": correct_answer,
            "explanation": explanation_text
        })
        
    return {
        "title": title,
        "audio_url": audio_url,
        "transcript": transcript_text,
        "translation": translation_text,
        "questions": questions
    }

def parse_writing_results(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Title
    title_span = soup.find("span", class_="fw-bold text-muted small d-block")
    title = title_span.get_text(strip=True) if title_span else "Unknown Writing Test"
    
    # Question text (contains task description)
    question_container = soup.select_one(".row.mt-4 .col-md-6:first-child .card")
    if not question_container:
        question_container = soup.select_one(".card")
    question_body = question_container.select_one(".card-body") if question_container else None
    question_text = question_body.get_text("\n", strip=True) if question_body else ""
    
    # Vietnamese Translation
    translation_div = soup.find("div", id="offcanvasTranslation")
    translation_body = translation_div.find("div", class_="offcanvas-body") if translation_div else None
    translation_text = translation_body.get_text("\n", strip=True) if translation_body else ""
    
    return {
        "title": title,
        "question": question_text,
        "translation": translation_text
    }

def parse_speaking_results(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Title
    title_span = soup.find("span", class_="fw-bold text-muted small d-block")
    title = title_span.get_text(strip=True) if title_span else "Unknown Speaking Test"
    
    # Question prompt text
    question_container = soup.select_one(".row.mt-4 .col-md-6:first-child .card")
    if not question_container:
        question_container = soup.select_one(".card")
    question_body = question_container.select_one(".card-body") if question_container else None
    question_text = question_body.get_text("\n", strip=True) if question_body else ""
    
    # Vietnamese Translation
    translation_div = soup.find("div", id="offcanvasTranslation")
    translation_body = translation_div.find("div", class_="offcanvas-body") if translation_div else None
    translation_text = translation_body.get_text("\n", strip=True) if translation_body else ""
    
    return {
        "title": title,
        "question": question_text,
        "translation": translation_text
    }

async def scrape_test(browser_context, category, test_id):
    output_path = os.path.join(DATA_DIR, category, f"{category}_{test_id}.json")
    if os.path.exists(output_path):
        print(f"[{category.capitalize()} {test_id}] Already exists. Skipping.")
        return True
        
    page = await browser_context.new_page()
    try:
        # Construct practice page URL
        # For speaking, reading, writing, listening, the URLs are:
        # /luyen-de/lam-bai-doc/{id}
        # /luyen-de/lam-bai-nghe/{id}
        # /luyen-de/lam-bai-viet/{id}
        # /luyen-de/lam-bai-noi/{id}
        url_map = {
            "reading": "lam-bai-doc",
            "listening": "lam-bai-nghe",
            "writing": "lam-bai-viet",
            "speaking": "lam-bai-noi"
        }
        
        url = f"https://luyenthivstep.vn/luyen-de/{url_map[category]}/{test_id}"
        print(f"[{category.capitalize()} {test_id}] Navigating to {url}...")
        await page.goto(url, wait_until="load", timeout=30000)
        await asyncio.sleep(2)
        
        # Check login redirect
        current_url = page.url
        if "login" in current_url or "dang-nhap" in current_url:
            print(f"[{category.capitalize()} {test_id}] Redirected to login page! Please log in first.")
            await page.close()
            return False
            
        result_url_keys = {
            "reading": "ket-qua-doc",
            "listening": "ket-qua-nghe",
            "writing": "ket-qua-viet",
            "speaking": "ket-qua-noi"
        }
        result_key = result_url_keys[category]
        
        # If we are already on a result page (user completed it previously)
        if result_key in current_url:
            print(f"[{category.capitalize()} {test_id}] Already submitted. Scraping results...")
            html = await page.content()
            data = scrape_and_parse_by_category(category, html)
            data["test_id"] = test_id
            data["results_url"] = current_url
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[{category.capitalize()} {test_id}] Saved successfully!")
            await page.close()
            return True
            
        # Bypass alerts & confirms
        await page.evaluate("() => { window.confirm = () => true; window.alert = () => true; }")
        
        # Action based on category
        if category == "reading":
            submit_btn = await page.query_selector("button.btn-submit")
            if not submit_btn:
                print(f"[{category.capitalize()} {test_id}] Submit button not found!")
                await page.close()
                return False
            await submit_btn.click()
            
        elif category == "listening":
            submit_btn = await page.query_selector("button.btn-submit")
            if not submit_btn:
                print(f"[{category.capitalize()} {test_id}] Submit button not found!")
                await page.close()
                return False
            await submit_btn.click()
            
        elif category == "writing":
            # For writing, we need to insert dummy text to textarea or form input
            textarea = await page.query_selector("textarea#writing_answer")
            if textarea:
                await textarea.focus()
                await page.keyboard.type("Dear Brianna, thank you for agreeing to look after my house and pet while I am away on holiday. I am really looking forward to my trip to Dubai and I am sure it will be wonderful. I will leave for Dubai on Monday morning at 8 AM, and I will return next Sunday evening around 6 PM. Since you do not have much experience looking after animals, here are some tips for my dog. You need to feed him twice a day, once in the morning and once in the evening. Also, please take him for a short walk in the afternoon. As for the household duties, please water the plants once every two days. Thank you so much for your help!")
                await asyncio.sleep(1)
            submit_btn = await page.query_selector("button#btn-submit")
            if not submit_btn:
                submit_btn = await page.query_selector("button.btn-submit")
            if not submit_btn:
                print(f"[{category.capitalize()} {test_id}] Submit button not found!")
                await page.close()
                return False
            await submit_btn.click()
            
        elif category == "speaking":
            # For speaking, we need to mock microphone media recorder
            mock_js = """
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const dest = ctx.createMediaStreamDestination();
                if (!navigator.mediaDevices) navigator.mediaDevices = {};
                navigator.mediaDevices.getUserMedia = function(constraints) {
                    return Promise.resolve(dest.stream);
                };
                console.log('MGD successfully');
            } catch(e) { console.error(e); }
            """
            await page.evaluate(mock_js)
            
            # Start recording
            start_btn = await page.query_selector("button#startBtn")
            if start_btn:
                await start_btn.click()
                print(f"[{category.capitalize()} {test_id}] Recording started...")
                await asyncio.sleep(3) # record for 3 seconds
                
                # Stop recording
                stop_btn = await page.query_selector("button#stopBtn")
                if stop_btn:
                    await stop_btn.click()
                    print(f"[{category.capitalize()} {test_id}] Recording stopped...")
                    await asyncio.sleep(2)
                    
            # Submit/upload speaking
            upload_btn = await page.query_selector("button#uploadBtn")
            if not upload_btn:
                upload_btn = await page.query_selector("button.btn-submit")
            if not upload_btn:
                print(f"[{category.capitalize()} {test_id}] Upload/Submit button not found!")
                await page.close()
                return False
            await upload_btn.click()
            
        # Wait for redirection to result page
        print(f"[{category.capitalize()} {test_id}] Waiting for redirect to results page...")
        redirected = False
        for _ in range(20):
            await asyncio.sleep(1)
            if result_key in page.url:
                redirected = True
                break
                
        if not redirected:
            print(f"[{category.capitalize()} {test_id}] Did not redirect to results page. Current URL: {page.url}")
            await page.close()
            return False
            
        # Retrieve content
        html = await page.content()
        data = scrape_and_parse_by_category(category, html)
        data["test_id"] = test_id
        data["results_url"] = page.url
        
        # Save to JSON
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"[{category.capitalize()} {test_id}] Scraped and saved successfully!")
        await page.close()
        return True
        
    except Exception as e:
        print(f"[{category.capitalize()} {test_id}] Error occurred: {str(e)}")
        try:
            await page.close()
        except:
            pass
        return False

def scrape_and_parse_by_category(category, html_content):
    if category == "reading":
        return parse_reading_results(html_content)
    elif category == "listening":
        return parse_listening_results(html_content)
    elif category == "writing":
        return parse_writing_results(html_content)
    elif category == "speaking":
        return parse_speaking_results(html_content)
    return {}

async def run_scraper(category, ids, delay):
    async with async_playwright() as p:
        print(f"Connecting to browser via CDP: {CDP_URL}...")
        try:
            browser = await p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            print(f"Failed to connect to CDP: {e}")
            return
            
        contexts = browser.contexts
        if not contexts:
            print("No browser context found.")
            return
        context = contexts[0]
        
        print(f"Starting scraping for category '{category}' for IDs: {ids}")
        success_count = 0
        fail_count = 0
        
        for idx, test_id in enumerate(ids):
            # Run scraper
            res = await scrape_test(context, category, test_id)
            if res:
                success_count += 1
            else:
                fail_count += 1
                
            # Add delay
            if idx < len(ids) - 1:
                print(f"Waiting {delay} seconds before next test...")
                await asyncio.sleep(delay)
                
        print(f"\nScraping Completed. Success: {success_count}, Fails: {fail_count}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape VSTEP tests via Chrome CDP")
    parser.add_argument("--category", required=True, choices=["reading", "listening", "writing", "speaking"], help="Category of tests")
    parser.add_argument("--start", type=int, help="Start ID")
    parser.add_argument("--end", type=int, help="End ID")
    parser.add_argument("--ids", type=str, help="Comma-separated IDs (overrides start/end)")
    parser.add_argument("--delay", type=int, default=3, help="Delay in seconds between pages")
    
    args = parser.parse_args()
    
    # Process IDs
    if args.ids:
        ids_list = [int(x.strip()) for x in args.ids.split(",") if x.strip().isdigit()]
    elif args.start is not None and args.end is not None:
        ids_list = list(range(args.start, args.end + 1))
    else:
        print("Please provide either --ids or both --start and --end.")
        exit(1)
        
    asyncio.run(run_scraper(args.category, ids_list, args.delay))
