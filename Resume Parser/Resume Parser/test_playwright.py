
from url_extractor import extract_portfolio

# Test with a JS-rendered website
url = "https://uday-portfolio-brown.vercel.app/"
print("Testing Playwright fallback test on", url)
result = extract_portfolio(url)
print("\nResult:")
print(result)
