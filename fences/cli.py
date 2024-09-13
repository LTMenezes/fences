from rich.console import Console
import time
from fences.agent import Agent
import os
from dotenv import load_dotenv
from rich import inspect
from flask import Flask, send_from_directory
from flask_cors import CORS, cross_origin
from flask import request
import re
import logging
import flask.cli


app = Flask(__name__, static_url_path="/static/", static_folder="../ui/build/static")
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
flask.cli.show_server_banner = lambda *args: None

anthropic_key = input("Enter your anthropic api key:")

console = Console()
agent = Agent(api_key=anthropic_key)

openapi_link = input("Enter your openapi spec link:")

parsed_info = None
with console.status("[bold green]Interpreting spec...") as status:
  parsed_info = agent.interpret_spec(openapi_link)
  diagram = parsed_info['diagram'].content[0].text
  parsed_info['diagram'] = re.search(r'```mermaid((.|\n)*)```',diagram).groups()[0]

console.print(":white_check_mark: OpenAPI Specification successfully parsed.")

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

@app.route("/send-request", methods=["POST"])
@cross_origin()
def send_request():
  data = request.json
  path = data['path']
  method = data['method'].upper()
  body = data['body']

  return agent.send_request(path, method, body)

def main():
  with console.status("[bold green]Running server") as status:
      console.print("You can reach it on: http://localhost:5000")
      app.run(debug=False, port=5000)

if __name__ == "__main__":
  main()
