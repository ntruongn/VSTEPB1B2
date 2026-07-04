import asyncio
import os
import json
import re
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

# Setup directories
DATA_DIR = os.path.abspath("./extracted_data")
os.makedirs(os.path.join(DATA_DIR, "reading"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "listening"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "writing"), exist_ok=True)
os.makedirs(os.path.join(DATA_DIR, "speaking"), exist_ok=True)

CDP_URL = "http://localhost:9222"

def clean_text(text):
    if not text:
        return ""
    # Replace multiple newlines or trailing whitespaces
    return re.sub(r'\n+', '\n', text).strip()

def parse_reading_results(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Title
    title_span = soup.find("span", class_="fw-bold text-muted small d-block")
    title = title_span.get_text(strip=True) if title_span else "Unknown Reading Test"
    
    # English Passage
    passage_card = soup.select_one(".row.mt-4 .col-md-6:first-child .card")
    passage_body = passage_card.select_one(".card-body") if passage_card else None
    passage_text = passage_body.get_text("\n", strip=True) if passage_body else ""
    
    # Vietnamese Translation (offcanvas)
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
        choice_divs = block.select(".ps-4.mb-2")
        for idx, opt_div in enumerate(choice_divs):
            opt_text = opt_div.get_text(strip=True)
            options.append(opt_text)
            # Check if correct (has text-success class)
            if opt_div.find(class_="text-success"):
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

async def scrape_reading_test(browser_context, test_id):
    output_path = os.path.join(DATA_DIR, "reading", f"reading_{test_id}.json")
    if os.path.exists(output_path):
        print(f"[Reading {test_id}] Already exists. Skipping.")
        return True
        
    page = await browser_context.new_page()
    try:
        url = f"https://luyenthivstep.vn/luyen-de/lam-bai-doc/{test_id}"
        print(f"[Reading {test_id}] Navigating to {url}...")
        await page.goto(url, wait_until="load", timeout=30000)
        await asyncio.sleep(2)
        
        # Check if redirected to login (not authenticated)
        current_url = page.url
        if "login" in current_url or "dang-nhap" in current_url:
            print(f"[Reading {test_id}] Redirected to login page. Please check login state!")
            await page.close()
            return False
            
        # Check if we are on a results page already (user completed it)
        if "ket-qua-doc" in current_url:
            print(f"[Reading {test_id}] Already submitted. Scraping results directly...")
            html = await page.content()
            data = parse_reading_results(html)
            data["test_id"] = test_id
            data["results_url"] = current_url
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[Reading {test_id}] Saved successfully!")
            await page.close()
            return True
            
        # Inject script to override confirmation alerts
        await page.evaluate("() => { window.confirm = () => true; window.alert = () => true; }")
        
        # Click submit button
        submit_btn = await page.query_selector("button.btn-submit")
        if not submit_btn:
            print(f"[Reading {test_id}] Submit button not found. Scraping exam page only...")
            # If there's no submit button, just extract questions without answers
            html = await page.content()
            # Simple fallback parser
            soup = BeautifulSoup(html, "html.parser")
            title_span = soup.find("span", class_="fw-bold text-muted small d-block")
            title = title_span.get_text(strip=True) if title_span else f"Reading Test {test_id}"
            await page.close()
            return False
            
        print(f"[Reading {test_id}] Clicking submit...")
        await submit_btn.click()
        
        # Wait for redirection to results page
        print(f"[Reading {test_id}] Waiting for redirect to results page...")
        for _ in range(15):
            await asyncio.sleep(1)
            if "ket-qua-doc" in page.url:
                break
        
        if "ket-qua-doc" not in page.url:
            print(f"[Reading {test_id}] Did not redirect to results page. Current URL: {page.url}")
            await page.close()
            return False
            
        # Retrieve content
        html = await page.content()
        data = parse_reading_results(html)
        data["test_id"] = test_id
        data["results_url"] = page.url
        
        # Save to JSON
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"[Reading {test_id}] Scraped and saved successfully!")
        await page.close()
        return True
        
    except Exception as e:
        print(f"[Reading {test_id}] Error: {str(e)}")
        try:
            await page.close()
        except:
            pass
        return False

async def main():
    async with async_playwright() as p:
        print(f"Connecting to browser via CDP: {CDP_URL}...")
        try:
            browser = await p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            print(f"Failed to connect to CDP at {CDP_URL}. Is Chrome running with debugging port?")
            print(e)
            return
            
        contexts = browser.contexts
        if not contexts:
            print("No active browser contexts found!")
            return
            
        context = contexts[0]
        print("Successfully connected to active browser context.")
        
        # Let's test with Reading Test 1 and 5
        print("\n--- Running Test Scraping ---")
        await scrape_reading_test(context, 1)
        await scrape_reading_test(context, 5)
        print("--- Test Scraping Done ---\n")

if __name__ == "__main__":
    asyncio.run(main())
