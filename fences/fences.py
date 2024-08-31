from rich.console import Console
import time
from agent import Agent
import os
from dotenv import load_dotenv
from rich import inspect
from flask import Flask, send_from_directory

load_dotenv("local.env")

app = Flask(__name__, static_url_path="/static/", static_folder="../ui/build/static")

console = Console()
agent = Agent(api_key=os.environ.get("ANTHROPIC_API_KEY"))

openapi_link = input("Insert your openapi spec link:")

parsed_spec = None
with console.status("[bold green]Interpreting spec...") as status:
  parsed_spec = agent.interpret_spec(openapi_link).content[0].text
  inspect(parsed_spec)

@app.route("/graph")
def get_graph():
  return parsed_spec

@app.route("/")
def index():
  return send_from_directory('../ui/build/', 'index.html')

if __name__ == "__main__":
  app.run()