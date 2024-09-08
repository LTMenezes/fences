from rich.console import Console
import time
from agent import Agent
import os
from dotenv import load_dotenv
from rich import inspect
from flask import Flask, send_from_directory
from flask_cors import CORS, cross_origin
from flask import request
import re

load_dotenv("local.env")

app = Flask(__name__, static_url_path="/static/", static_folder="../ui/build/static")
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

console = Console()
agent = Agent(api_key=os.environ.get("ANTHROPIC_API_KEY"))

openapi_link = "http://localhost:8080/v3/api-docs"#input("Insert your openapi spec link:")

parsed_info = None
with console.status("[bold green]Interpreting spec...") as status:
  parsed_info = agent.interpret_spec(openapi_link)
  diagram = parsed_info['diagram'].content[0].text
  parsed_info['diagram'] = re.search(r'```mermaid((.|\n)*)```',diagram).groups()[0]
  inspect(parsed_info)

@app.route("/info")
@cross_origin()
def get_graph():
  return parsed_info

@app.route("/")
def index():
  return send_from_directory('../ui/build/', 'index.html')

@app.route("/generate-request-body", methods=["POST"])
@cross_origin()
def generate_request_body():
  data = request.json
  path = data['path']
  method = data['method'].upper()
  return agent.generate_suggested_request(path, method)

if __name__ == "__main__":
  app.run()
