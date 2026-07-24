from config import client
from prompts import CATEGORY_PROMPT


def categorize_expense(expense: str) -> str:
    """
    Categorize a user's expense using the Groq LLM.
    """

    prompt = CATEGORY_PROMPT.format(expense=expense)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an AI expense categorization assistant for the PayCircle application."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0
        )

        category = response.choices[0].message.content.strip()

        return category

    except Exception as e:
        return f"Error: {e}"


if __name__ == "__main__":
    expense = input("Enter expense description: ")

    category = categorize_expense(expense)

    print("\nExpense Category:", category)