import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

# Read API key
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("GROQ_API_KEY not found in .env file.")
    exit()

# Create Groq client
client = Groq(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": "Say Hello! My GenAI setup is working."
            }
        ]
    )

    print("Groq Connected Successfully!\n")
    print("AI Response:")
    print(response.choices[0].message.content)

except Exception as e:
    print("Error:")
    print(e)
