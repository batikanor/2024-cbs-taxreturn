import React, { useState, useEffect } from 'react';
import MuiAlert from '@mui/material/Alert';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Container, Typography, Card, CardContent, Button, Snackbar, Grid, Box, TextField } from '@mui/material';

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

function App() {
  const [addedPersons, setAddedPersons] = useState([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [llamaQuery, setLlamaQuery] = useState('');
  const [llamaResponse, setLlamaResponse] = useState('');
  
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
    showNotification(`Processed: ${addedPersons[index].name}`);
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
          A Project of Some Sorts
        </Typography>
        <Box sx={{ mt: 2, mb: 2 }}>
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
        </Box>
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
                  {person.processed ? (
                    <Typography variant="body2" color="success.main">Processed</Typography>
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
            Reset HTML
          </Button>
          <Button variant="outlined" color="primary" onClick={addKlopp}>
            Add Klopp If Missing
          </Button>
        </Box>

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <iframe src={htmlContent} style={{ width: '100%', height: '300px', border: 'none' }} title="HTML Content"></iframe>
          </CardContent>
        </Card>

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
