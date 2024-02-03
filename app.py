from flask import Flask, jsonify, send_from_directory
import os
from flask_cors import CORS
import re  # Import regular expressions for parsing HTML
from llama_cpp import Llama
from transformers import LlamaTokenizerFast
from flask import request

app = Flask(__name__, static_folder='.')
CORS(app)


DEFAULT_QUESTION ="Start your answer with 'I don't understand what you said, but here is a funny joke: ' and then make a joke."
GPT_SYSTEM_TEXT="Always be formal in your answers and care about both financial and non-financial aspects."
LLAMA_LIMIT=2048


HTML_FILE = 'presidents.html'
DEFAULT_CONTENT = """<table>
<tr>
<th>Name</th>
<th>Email</th>
</tr>
<tr>
<td>Obama</td>
<td>barack.obama@cbs.com</td>
</tr>
<tr>
<td>Trump</td>
<td>donald.trump@cbs.com</td>
</tr>
<tr>
<td>Biden</td>
<td>joe.biden@cbs.com</td>
</tr>
</table>"""



llama2_path = 'C:/0_development/04_preparations/llama-2-7b-chat.Q5_K_M.gguf'
LLM = Llama(model_path=llama2_path, n_ctx=LLAMA_LIMIT)
llama_tokenizer = LlamaTokenizerFast.from_pretrained("hf-internal-testing/llama-tokenizer")


if not os.path.exists(HTML_FILE):
    with open(HTML_FILE, 'w') as file:
        file.write(DEFAULT_CONTENT)

def generate_llama_response(query): 
    global llama_response_str
    prompt = f"Q: {query} A:"
    output = LLM(prompt, max_tokens=None, stop=["Q:", "\n"], ) 
    resp = output["choices"][0]["text"]
    print(f"{resp=}")
    return jsonify({'llama_data': resp})


@app.route('/generate_llama_response', methods=['POST'])
def generate_llama_response_route():
    data = request.json
    query = data.get("query")
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    return generate_llama_response(query)

@app.route('/add_klopp', methods=['POST'])
def add_klopp():
    with open(HTML_FILE, 'r') as file:
        content = file.read()
    if 'Jurgen Klopp' not in content:
        new_row = '<tr><td>Jurgen Klopp</td><td>jurgen.klopp@cbs.com</td></tr>'
        content = content.replace('</table>', f'{new_row}\n</table>')
        with open(HTML_FILE, 'w') as file:
            file.write(content)
    return jsonify({'message': 'If not present, Jurgen Klopp added with email'})

@app.route('/', methods=['GET'])
def index():
    return jsonify({'message': 'Backend Working'})

@app.route('/reset_html', methods=['POST'])
def reset_html():
    with open(HTML_FILE, 'w') as file:
        file.write(DEFAULT_CONTENT)
    return jsonify({'message': 'HTML reset successful'})

@app.route('/get_last_added_person', methods=['GET'])
def get_last_added_person():
    with open(HTML_FILE, 'r') as file:
        content = file.read()

    # Use regular expression to find all rows in the table
    matches = re.findall(r'<tr><td>(.*?)</td><td>(.*?)</td></tr>', content)
    
    # Select the last match if it exists
    last_added_person = matches[-1] if matches else ("", "")
    
    # Return the name and email of the last added person
    return jsonify({'name': last_added_person[0], 'email': last_added_person[1]})

@app.route('/presidents.html', methods=['GET'])
def serve_html():
    return send_from_directory('.', HTML_FILE)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
