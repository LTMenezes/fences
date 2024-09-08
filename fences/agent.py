import anthropic
import os
import requests
import json

PARSE_PROMPT = """
You're a system who's goal is to interpret OpenAPI specifications and help to create human-readable diagrams from them.
You will return this interpretation in the Mermaid diagram specification versuib 11.0.2. Identify different users of the application and name them accordingly.
Return only the diagram, no other information.
You can ignore controller names, the nodes on the graph will be the path of the endpoints and the arrows linking them will be the HTTP verb that they support.
Make sure there are no identation errors in the diagram.
Don't create any subgraphs or any other complex structures, only users connecting to their endpoints or series of endpoints.
Always append a finishing / to the end of each endpoint on the diagram to avoid breaking mermaid, also change curly braces on endpoints for an apostrophe.
Do your best to give descriptive names for each type of user of the applications, for example (End User, Admin, systems, etc.).

This is the specification:
{spec}
"""

GENERATE_REQUEST_BODY_PROMPT = """
You're a system who's goal is to automatically generate suggest request bodys given an OpenAPI specification and the desired HTTP verb.

The target endpoint is '{path}' and the desired verb is: '{method}'.
Try your best to fill the values of this body with information that makes sense given the specifications, name of the fields, the endpoint name and the expected output.
All the keys need to be included even if it's just with a placeholder value in cases you are not sure about the value.

This is the specification:
{spec}

What should be the request body for this request?
Return only the the minified json body, no other information and no formating is needed.
"""

class Agent():
  def __init__(self, api_key):
    self.initialize_agent(api_key)

  def initialize_agent(self, api_key):
    self.client = anthropic.Anthropic(api_key=api_key)

  def interpret_spec(self, spec_link):
    self.cur_spec = self.fetch_spec(spec_link)
    diagram = self.llm_request(PARSE_PROMPT.format(spec=self.cur_spec))
    self.servers = self.cur_spec.get('servers', []) if self.cur_spec.get('servers', None) else []
    self.target_server = self.servers[0]['url'] if len(self.servers)!= 0 else None
    return {
      'title': self.cur_spec['info']['title'],
      'diagram': diagram,
      'server': self.servers,
      'spec': self.cur_spec,
    }

  def fetch_spec(self, spec_link):
    try:
        response = requests.get(spec_link)
        
        if response.status_code == 200:
            openapi_spec = json.loads(response.text)
            return openapi_spec
        else:
            print(f"Failed to fetch OpenAPI spec. Status code: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching the OpenAPI spec: {e}")
        raise e
    
  def llm_request(self, prompt):
    response = self.client.messages.create(
        model="claude-3-5-sonnet-20240620",
        messages = [{
           "role": "user",
           "content": prompt,
        }],
        max_tokens=2048
    )
    return response

  def generate_suggested_request(self, path, method):
    request_body = self.llm_request(GENERATE_REQUEST_BODY_PROMPT.format(path=path, method=method, spec=self.cur_spec))
    return {
      'suggest_body': request_body.content[0].text,
      'path': path,
      'method': method,
    }

  def send_request(self, path, method, body):
    try:
      response = requests.request(
        method=method.upper(),
        headers={'Content-type': 'application/json', 'Accept': 'application/json'},
        # TODO: Currently removing the last empty slash that was artificially added to not break mermaid
        url=self.target_server + path[:-1],
        data=body
      )
      
      if response.status_code == 200:
          res = json.loads(response.text)
          return res
      else:
          print(f"Failed to perform request: {response.status_code}")
          return None
    except requests.exceptions.RequestException as e:
      print(f"An error occurred while performing request: {e}")
      raise e
