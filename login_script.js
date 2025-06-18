// Salva questo codice come login_script.js nella cartella 'public'

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const showRegisterLink = document.getElementById('show-register');
    const registerModal = document.getElementById('register-modal');
    const registerForm = document.getElementById('register-form');
    const registerMessage = document.getElementById('register-message');
    const closeButtons = document.querySelectorAll('.modal .close-button');

    const customAlertModal = document.getElementById('custom-alert-modal');
    const customAlertTitle = document.getElementById('custom-alert-title');
    const customAlertMessage = document.getElementById('custom-alert-message');
    const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
    const customAlertCancelBtn = document.getElementById('custom-alert-cancel-btn'); // Non serve qui ma per consistenza

    // Funzione per mostrare un messaggio personalizzato
    const showMessageModal = (title, message, type = 'info') => {
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        customAlertOkBtn.style.display = 'inline-block';
        customAlertCancelBtn.style.display = 'none'; // Nascondi annulla per gli alert
        customAlertModal.style.display = 'flex';
        return new Promise(resolve => {
            customAlertOkBtn.onclick = () => {
                customAlertModal.style.display = 'none';
                resolve(true);
            };
        });
    };

    // Funzione per chiudere tutti i modali
    const closeAllModals = () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        // Assicurati di nascondere anche il modal di alert/conferma
        customAlertModal.style.display = 'none';
    };

    // Gestione chiusura modali con la 'X'
    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Chiudi modali cliccando fuori dal contenuto
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });


    // Funzione per mostrare/nascondere il modal di registrazione
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.style.display = 'flex'; // Mostra il modal
        registerForm.reset();
        registerMessage.textContent = '';
    });

    // Gestione del login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginForm.username.value;
        const password = loginForm.password.value;

        loginMessage.textContent = 'Accesso in corso...';
        loginMessage.style.color = 'blue';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                loginMessage.textContent = data.message;
                loginMessage.style.color = 'green';
                // Salva l'ID dello studente in sessionStorage se è un account studente
                if (data.role === 'student' && data.studentId) {
                    sessionStorage.setItem('loggedInStudentId', data.studentId);
                } else {
                    sessionStorage.removeItem('loggedInStudentId'); // Assicurati che non ci siano ID studente in sessione per l'admin
                }

                if (data.role === 'admin') {
                    window.location.href = '/admin-dashboard.html';
                } else if (data.role === 'student') {
                    window.location.href = `/student-dashboard.html?studentId=${data.studentId}`; // Passa l'ID dello studente nell'URL e in sessionStorage
                }
            } else {
                loginMessage.textContent = data.error || 'Credenziali non valide.';
                loginMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Errore di rete durante il login:', error);
            loginMessage.textContent = 'Errore di connessione al server.';
            loginMessage.style.color = 'red';
            showMessageModal('Errore di Connessione', 'Impossibile connettersi al server. Assicurati che sia in esecuzione.');
        }
    });

    // Gestione della registrazione
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = registerForm['reg-username'].value;
        const password = registerForm['reg-password'].value;
        const studentEmail = registerForm['student-email-register'].value;

        registerMessage.textContent = 'Registrazione in corso...';
        registerMessage.style.color = 'blue';

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, studentId: studentEmail })
            });

            const data = await response.json();

            if (response.ok) {
                await showMessageModal('Successo!', 'Account creato con successo! Ora puoi effettuare il login.');
                registerForm.reset();
                closeAllModals(); // Chiude il modal di registrazione
                loginMessage.textContent = 'Registrazione completata, effettua il login.';
                loginMessage.style.color = 'green';
            } else {
                registerMessage.textContent = data.error || 'Errore durante la registrazione.';
                registerMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Errore di rete durante la registrazione:', error);
            registerMessage.textContent = 'Errore di connessione al server.';
            registerMessage.style.color = 'red';
            showMessageModal('Errore di Connessione', 'Impossibile connettersi al server per la registrazione. Assicurati che sia in esecuzione.');
        }
    });
});
