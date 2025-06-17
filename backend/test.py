from together import Together

client = Together(api_key="3a823237163e2759f94c94b7a7b32f2454cfe3a0dbf677afe8090d16dd1ef4c7")

response = client.chat.completions.create(
    model="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    messages=[
      {
        "role": "user",
        "content": "What time is it?"
      }
    ]
)
print(response.choices[0].message.content)