import React, { useState, useEffect } from 'react';
import MuiAlert from '@mui/material/Alert';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Container, Typography, Card, CardContent, Button, Snackbar, Grid, Box, TextField, Checkbox, FormControlLabel, Divider } from '@mui/material';
import io from 'socket.io-client';

const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: '#ff1744',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
});

const backendUrl = 'http://localhost:5000';
const socket = io(backendUrl); // Connect to Socket.IO server

function App() {
  const [addedPersons, setAddedPersons] = useState([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [llamaQuery, setLlamaQuery] = useState('');
  const [llamaResponse, setLlamaResponse] = useState('');
  const [showHtml, setShowHtml] = useState(false); 

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  const showNotification = (message) => {
    setSnackbarMessage(message);
    setOpenSnackbar(true);
  };

  useEffect(() => {



    socket.on('first_message_sent', (message) => {
      // Update state to reflect the email received

      setAddedPersons((currentPersons) =>
      currentPersons.map((person) =>
        message.to.includes(person.email) // Check if person.email is a substring of message.to
          ? { ...person, emailSent: message.body, processed: true }
          : person
        )
      );
    });

    // Listen for 'email_received' events from the server
    socket.on('email_received', (message) => {
      // Update state to reflect the email received

      setAddedPersons((currentPersons) =>
      currentPersons.map((person) =>
        message.from.includes(person.email) // Check if person.email is a substring of message.to
          ? { ...person, emailReceived: message.body, processed: true }
          : person
        )
      );
    });

    // Listen for 'response_sent' events from the server
    socket.on('response_sent', (message) => {
      // Update state to reflect the response sent
      console.log('response_sent received from socket')
      console.log(message)  
      setAddedPersons((currentPersons) =>
      currentPersons.map((person) =>
        message.to.includes(person.email) // Check if person.email is a substring of message.to
          ? { ...person, responseSent: message.body, processed: true }
          : person
        )
      );
    });

    // Clean up on component unmount
    return () => {
      socket.off('email_received');
      socket.off('response_sent');
    };
  }, []);


  useEffect(() => {
    fetchHtmlContent();
  }, []);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetch(`${backendUrl}/get_last_added_person`)
        .then(response => response.json())
        .then(data => {
          if (data.name && data.email && !addedPersons.find(person => person.name === data.name && person.email === data.email)) {
            const newPerson = { name: data.name, email: data.email, processed: false };
            setAddedPersons(prevPersons => [...prevPersons, newPerson]);
          }
        })
        .catch(error => console.error('Error fetching last added person:', error));
    }, 1000);
    return () => clearInterval(pollInterval);
  }, [addedPersons]);

  const fetchHtmlContent = () => {
    fetch(`${backendUrl}/presidents.html`)
      .then(response => response.text())
      .then(html => {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setHtmlContent(url);
      })
      .catch(error => console.error('Failed to fetch HTML content:', error));
  };

  const resetHtml = () => {
    fetch(`${backendUrl}/reset_html`, { method: 'POST' })
      .then(() => {
        fetchHtmlContent();
        setAddedPersons([]);
      })
      .catch(error => console.error('Failed to reset HTML:', error));
  };

  const addKlopp = () => {
    fetch(`${backendUrl}/add_klopp`, { method: 'POST' })
      .then(() => fetchHtmlContent())
      .catch(error => console.error('Failed to add Klopp:', error));
  };


  const processPerson = (index) => {
    const newPersons = [...addedPersons];
    newPersons[index].processed = true;
    setAddedPersons(newPersons);
    let victim_email = newPersons[index].email
    fetch(`${backendUrl}/read_email_and_send_response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: victim_email }),
    }).catch(error => console.error('Error processing person:', error));

    showNotification(`Processing: ${addedPersons[index].name}`);
  };
  const fetchLlamaResponse = () => {
    fetch(`${backendUrl}/generate_llama_response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: llamaQuery }),
    })
    .then((response) => response.json())
    .then((data) => {
      setLlamaResponse(data.llama_data);
      showNotification('Llama response fetched successfully');
    })
    .catch((error) => {
      console.error('Error:', error);
      showNotification('Failed to fetch Llama response');
    });
  };
  

  return (
    <ThemeProvider theme={theme}>
      <Container sx={{ my: 2, backgroundColor: 'background.default', p: 2 }}>
        <Typography variant="h4" gutterBottom>
          BiggerPhish
        </Typography>
        {/* <Box sx={{ mt: 2, mb: 2 }}>
          <TextField
            label="Ask Llama"
            variant="outlined"
            fullWidth
            value={llamaQuery}
            onChange={(e) => setLlamaQuery(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Button variant="contained" color="primary" onClick={fetchLlamaResponse}>
            Get Response
          </Button>
        </Box> */}
        {llamaResponse && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">Llama Response:</Typography>
            <Typography variant="body2">{llamaResponse}</Typography>
          </Box>
        )}


        <Grid container spacing={2}>
          {addedPersons.map((person, index) => (
            <Grid item xs={12} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="body1">{`${person.name} - ${person.email}`}</Typography>
                  {person.emailSent && person.emailSent.length > 0 && (
                    <>
                      <Typography variant="body2" color="textSecondary">Email Sent:</Typography>
                      <Typography variant="body2" color="textSecondary">{`${person.emailSent}`}</Typography>
                    </>
                  )}
                  {/* {person.emailReceived && Array.isArray(person.emailReceived) && person.emailReceived.length > 0 && (
                    <>
                      <Typography variant="body2" color="textSecondary">Emails Received:</Typography>
                      <ul>
                        {person.emailReceived.map((email, emailIndex) => (
                          <li key={emailIndex}>{email}</li>
                        ))}
                      </ul>
                    </>
                  )} */}
                  <Divider />

                  {person.emailReceived && Array.isArray(person.emailReceived) && person.emailReceived.length > 0 && (
                    <>
                      {/* <Typography variant="body2" color="textSecondary">First Email Received:</Typography> */}
                      {/* Render only the first (reality: last) email received */}
                      <Typography variant="body2" color="textSecondary">{person.emailReceived[0]}</Typography>
                    </>
                  )}
                  <Divider />

                  {person.responseSent && (
                    <Typography variant="body2" color="textSecondary">{`Response Sent: ${person.responseSent}`}</Typography>
                  )}
                  <Divider />


                  {person.processed ? (
                    <Typography variant="body2" color="success.main">Processing</Typography>
                  ) : (
                    <Button variant="contained" color="primary" onClick={() => processPerson(index)}>
                      Process
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
     

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button variant="outlined" color="secondary" onClick={resetHtml}>
            Reset Target Webpage
          </Button>
          <Button variant="outlined" color="primary" onClick={addKlopp}>
            Add Klopp If Missing
          </Button>
          <FormControlLabel
            control={
              <Checkbox
                checked={showHtml}
                onChange={(e) => setShowHtml(e.target.checked)}
                name="showHtmlCheckbox"
              />
            }
            label="Show Target Webpage"
          />
        </Box>

        {showHtml && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <iframe src={htmlContent} style={{ width: '100%', height: '300px', border: 'none' }} title="HTML Content"></iframe>
            </CardContent>
          </Card>
        )}


        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <MuiAlert onClose={handleCloseSnackbar} severity="success" elevation={6} variant="filled">
            {snackbarMessage}
          </MuiAlert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default App;
