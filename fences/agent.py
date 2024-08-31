import anthropic
import os
import requests
import json

PARSE_PROMPT = """
You're a system who's goal is to interpret OpenAPI specifications and help to create human-readable diagrams from them.
You will return this interpretation in the Mermaid diagram specification. Identify different users of the application and name them accordingly.
Return only the diagram, no other information.
You can ignore controller names, the nodes on the graph will be the path of the endpoints and the arrows linking them will be the HTTP verb that they support.
Make sure there are no identation errors in the diagram.
Don't create any subgraphs or any other complex structures, only users connecting to their endpoints or series of endpoints.

This is the specification:
{spec}
"""


class Agent():
  def __init__(self, api_key):
    print(api_key)
    self.initialize_agent(api_key)

  def initialize_agent(self, api_key):
    self.client = anthropic.Anthropic(api_key=api_key)

  def interpret_spec(self, spec_link):
    self.cur_spec = self.fetch_spec(spec_link)
    res = self.llm_request(PARSE_PROMPT.format(spec=self.cur_spec))
    print(res)
    return res

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
    print(response)
    return response
