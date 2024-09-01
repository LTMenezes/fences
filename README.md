# Fences

An LLM augmented openAPI specification interpreter that provides a human-readable interactive representation of APIs.

# Usage
```sh
pip install fences # Installation command
fences LINK_TO_THE_OPENAPI_SPEC
```

You will be prompted to enter your anthropic key so that fences can make requests to an LLM model to parse the OpenAPI specification.

# How to contribute
PR's are welcome!

Please create an issue before opening a PR so that we can discuss the changes you want to make.

# How to setup your dev enviroment

```sh
pip install -r requirements.txt
cd ui && npm install && npm run build && cd..
python fences/fences.py
```
