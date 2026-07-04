import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    # Path to store the user data (session, cookies, etc.)
    user_data_dir = os.path.abspath("./user_data")
    print(f"Using browser profile directory: {user_data_dir}")

    async with async_playwright() as p:
        # Launch headful browser context (visual mode so you can interact with it)
        context = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,  # visual mode
            viewport={"width": 1280, "height": 800},
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        
        # Open a new page
        page = await context.new_page()
        
        # Navigate to target website
        print("Navigating to luyenthivstep.vn...")
        await page.goto("https://luyenthivstep.vn/")
        
        print("\n" + "="*60)
        print("INSTRUCTIONS:")
        print("1. A browser window should have opened.")
        print("2. Please log in to your account manually on the webpage.")
        print("3. Solve any CAPTCHA or enter OTP as required.")
        print("4. Navigate to a logged-in page (e.g. your dashboard) to confirm you're in.")
        print("5. Once you are successfully logged in, come back to this terminal")
        print("   and press Enter to save your session and close the browser.")
        print("="*60 + "\n")
        
        input("Press Enter here when you have successfully logged in...")
        
        # Wait a moment to ensure cookies are fully set/saved
        await asyncio.sleep(2)
        
        # Close browser
        await context.close()
        print("Browser context closed and session saved successfully!")

if __name__ == "__main__":
    asyncio.run(main())
