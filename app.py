from flask import Flask, jsonify, send_from_directory
import os
from flask_cors import CORS
import re  # Import regular expressions for parsing HTML
from llama_cpp import Llama
from transformers import LlamaTokenizerFast
from flask import request
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import imaplib
import email
from email.policy import default
import imaplib
import smtplib
from email.mime.text import MIMEText
from email.parser import Parser
from email.header import decode_header


# Load the .env file
load_dotenv()

# Now you can read the environment variables using os.getenv
email_user = os.getenv('email_user')
email_pass = os.getenv('email_pass')
imap_host = os.getenv('imap_host')
imap_port = int(os.getenv('imap_port'))
smtp_host = os.getenv('smtp_host')
smtp_port = int(os.getenv('smtp_port'))


app = Flask(__name__, static_folder='.')
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")


ORGANIZATION_NAME = ''


# template = """
# Generate an email for {name} because they recently joined the {organization} in {location} and request them to send their tax return document to send it to the administration. It is needed for their new employment registration process.
# """

# Example usage:
# name = "Shaw Johnny"  # This can be dynamically replaced
# organization = "House of Representatives"
# location = "Tennessee"

# Fill the template with the specific details
# filled_template = template.format(name=name, organization=organization, location=location)

# print(filled_template)


# FM: FIRST MESSAGE
# name = "Jurgen Klopp"
# organization = "the House of Representatives Tennessee"
# document = "tax return documents"
# excuse = "their new employment registration process"
FM_1 = """
Generate an email for {name} because they recently joined {organization} and request them to send their {document} to send it to the administration. It is needed for {excuse}.
"""
FM_2 = "generate an email for {name} because he recently joined {organization} and request them to send their {document} to send it to the administration. It is needed for {excuse}. Note that this is only for the registration process and high confidential, it will never be published to the public. Don't provide a name and he should send it back either by mailing (provide address) or by email just by answering this email."

# FQ: FIRST QUERY (THEY RESPOND TO OUR MESSAGE)

# FR_1: WE RESPOND JUST BY PROVIDING THEM WITH THE FIRST MESSAGE, THEIR QUERY, AND WHATEVER LLM ANSWERS WITH AFTER Q:
# FR_2: We give the LLM the first rule, past conversation, and also add the following commmand
FR_2 =  "Please answer the question to make sure they understand how to provide their data. Don't forget that they Must provide the data!"


DEFAULT_QUESTION ="Start your answer with 'I don't understand what you said, but here is a funny joke: ' and then make a joke."
GPT_SYSTEM_TEXT="Always be formal in your answers and care about both financial and non-financial aspects."
LLAMA_LIMIT=2048


HTML_FILE = 'presidents.html'
TEMPLATE_FILE = 'presidents-template.html'
def read_default_content():
    with open(TEMPLATE_FILE, 'r') as file:
        return file.read()

# Use this function to initialize DEFAULT_CONTENT or directly within your reset_html function
DEFAULT_CONTENT = read_default_content()



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
        kloppmail = "notjurgenklopp@gmail.com"
        new_row = f'<tr><td>Jurgen Klopp</td><td>{kloppmail}</td></tr>'
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

def notify_client(action, email_address, text=""):
    message = {
        "action": action,
        "email_address": email_address,
        "text": text,
    }
    emit('update', message, broadcast=True)


@app.route('/send_email', methods=['POST'])
def handle_send_email():
    data = request.json
    email_address = data.get('email')

    if not email_address:
        return jsonify({'error': 'No email address provided'}), 400

    # Placeholder: send email logic here
    # send_email(email_address, "aa")
    notify_client("sent_email", email_address, "aa")

    # Placeholder for the response waiting and sending "bb" logic
    # response_text = wait_for_email_response()
    # send_email(email_address, f"bb {response_text}")
    # notify_client("response_received_and_replied", email_address, f"bb {response_text}")

    return jsonify({"status": "Email process initiated"})

@app.route('/read_email_and_send_response', methods=['POST'])
def read_email_and_send_response():
    data = request.json
    victim_mail = data.get("email")
    if not victim_mail:
        return jsonify({'error': 'No victim mail provided'}), 400
    
    # Connect to the email server
    mail = imaplib.IMAP4_SSL(imap_host, imap_port)
    mail.login(email_user, email_pass)
    mail.select('inbox')

    # Search for all unread emails
    status, email_ids = mail.search(None, 'UNSEEN')
    if status == 'OK':
        if email_ids[0]:  # Ensure there is at least one unread email
            latest_email_id = email_ids[0].split()[-1]  # Get the latest unread email
            
            # Fetch the email's body
            status, data = mail.fetch(latest_email_id, '(RFC822)')
            if status == 'OK':
                # Parse the email content
                msg = email.message_from_bytes(data[0][1], policy=default)
                
                # Validate sender's email address
                from_address = msg["From"]
                if victim_mail not in from_address:
                    print(f"{from_address, victim_mail=}", 'victim_mail not in from_address')
                    return jsonify({'error': 'victim_mail not in from_address'}), 400

                # Extract email body for plain text or HTML
                email_body = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition"))
                        
                        if content_type == "text/plain" and "attachment" not in content_disposition:
                            email_body = part.get_payload(decode=True).decode()
                        elif content_type == "text/html" and "attachment" not in content_disposition:
                            email_body = part.get_payload(decode=True).decode()
                else:
                    email_body = msg.get_payload(decode=True).decode()

                # Notify frontend: Email received
                socketio.emit('email_received', {'from': from_address, 'body': email_body})
                
                # Prepare and send response via SMTP
                smtp_server = smtplib.SMTP(smtp_host, smtp_port)
                smtp_server.starttls()
                smtp_server.login(email_user, email_pass)
                response_text = email_body + "\nack"  # Customize your response
                msg = MIMEText(response_text)
                msg['From'] = email_user
                msg['To'] = from_address
                msg['Subject'] = "Response to your email"
                smtp_server.sendmail(email_user, from_address, msg.as_string())
                smtp_server.quit()
                
                # Notify frontend: Response sent
                socketio.emit('response_sent', {'to': from_address, 'body': response_text})

                return jsonify({"status": "Email processed and response sent"})
        else:
            print({'error': 'No unread emails found'})
            return jsonify({'error': 'No unread emails found'}), 404
    else:
        print({'error': 'Failed to search for unread emails'})
        return jsonify({'error': 'Failed to search for unread emails'}), 500

    

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
