"""Quick test to verify max_sources is respected."""
import requests

def test(max_sources):
    print(f"\n{'='*50}")
    print(f"Testing with max_sources = {max_sources}")
    print(f"{'='*50}")
    r = requests.post(
        "http://localhost:8000/api/research/start",
        json={"topic": "artificial intelligence", "max_sources": max_sources, "search_depth": "standard"}
    )
    data = r.json()
    sources = data.get("candidate_sources", [])
    print(f"Requested: {max_sources}")
    print(f"Got: {len(sources)} sources")
    for i, s in enumerate(sources):
        print(f"  {i+1}. {s['title'][:70]}")
    return len(sources)

# Test with 6 sources
test(6)
