// Salva questo codice come server.js nella cartella principale 'portale-studenti'

const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Per generare ID unici

// Importa e inizializza Firebase Admin SDK
const admin = require('firebase-admin');

// Percorso alla tua Service Account Key JSON
// Questo è il file che hai scaricato da Firebase e rinominato
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Ottieni un riferimento all'istanza di Firestore
const db = admin.firestore();

const app = express();
const PORT = 3000; // Puoi mantenere 3000 o cambiarla come preferisci

// Path per la cartella dei file statici
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware per parsare il body delle richieste JSON
app.use(express.json());

// Middleware per servire i file statici dalla cartella 'public'
app.use(express.static(PUBLIC_DIR));

// NON ABBIAMO PIÙ BISOGNO DI initializeDataFile() o initializePublicDirectory()
// Queste erano per la gestione del file system locale.
// Firestore gestisce i dati e la directory public è garantita dalla tua struttura.

// --- Funzioni Helper per interazione con Firestore (non più global read/write) ---
// Ogni API interagirà direttamente con Firestore

// --- API di Autenticazione e Registrazione ---

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('username', '==', username).where('password', '==', password).get();

        if (!snapshot.empty) {
            const user = snapshot.docs[0].data();
            // In un'applicazione reale, useresti sessioni/token JWT qui per la sicurezza
            res.json({ message: 'Login effettuato con successo!', role: user.role, userId: snapshot.docs[0].id, studentId: user.studentId });
        } else {
            res.status(401).json({ error: 'Credenziali non valide.' });
        }
    } catch (error) {
        console.error('Errore nel login:', error);
        res.status(500).json({ error: 'Errore interno del server durante il login.' });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, studentId: providedStudentEmail } = req.body;

    try {
        const usersRef = db.collection('users');
        const studentsRef = db.collection('students');

        // Validazione: username già esistente
        const existingUserSnapshot = await usersRef.where('username', '==', username).get();
        if (!existingUserSnapshot.empty) {
            return res.status(400).json({ error: 'Username già in uso.' });
        }

        // Trova lo studente per email
        const studentSnapshot = await studentsRef.where('email', '==', providedStudentEmail).limit(1).get();
        if (studentSnapshot.empty) {
            return res.status(404).json({ error: 'Email studente non trovata nel database. Registrazione non permessa. Contatta l\'amministratore.' });
        }
        const student = studentSnapshot.docs[0].data();
        const studentFirestoreId = studentSnapshot.docs[0].id; // L'ID effettivo del documento studente in Firestore

        // Controlla se lo studente ha già un account utente collegato
        const existingStudentAccountSnapshot = await usersRef.where('role', '==', 'student').where('studentId', '==', studentFirestoreId).get();
        if (!existingStudentAccountSnapshot.empty) {
            return res.status(400).json({ error: 'Uno studente con questa email ha già un account utente collegato.' });
        }

        const newUser = {
            username,
            password, // AVVISO: In un'applicazione reale, le password vanno HASHATE e SALATE!
            role: 'student',
            studentId: studentFirestoreId // Collega l'utente all'ID del documento studente in Firestore
        };

        const newUserRef = await usersRef.add(newUser); // Firestore genera un ID per il nuovo utente
        res.status(201).json({ message: 'Account studente registrato con successo!', user: { id: newUserRef.id, ...newUser } });
    } catch (error) {
        console.error('Errore durante la registrazione:', error);
        res.status(500).json({ error: 'Errore interno del server durante la registrazione.' });
    }
});

// GET tutti gli utenti (usato per trovare il nome utente nella dashboard studente)
app.get('/api/users', async (req, res) => {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), password: undefined })); // Non inviare le password
        res.json(users);
    } catch (error) {
        console.error('Errore nel recupero utenti:', error);
        res.status(500).json({ error: 'Errore interno del server nel recupero utenti.' });
    }
});

// --- API Corsi ---

// GET tutti i corsi
app.get('/api/courses', async (req, res) => {
    try {
        const coursesRef = db.collection('courses');
        const snapshot = await coursesRef.get();
        const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(courses);
    } catch (error) {
        console.error('Errore nel recupero corsi:', error);
        res.status(500).json({ error: 'Errore interno del server nel recupero corsi.' });
    }
});

// GET un singolo corso per ID
app.get('/api/courses/:id', async (req, res) => {
    try {
        const courseDoc = await db.collection('courses').doc(req.params.id).get();
        if (!courseDoc.exists) {
            return res.status(404).json({ error: 'Corso non trovato.' });
        }
        res.json({ id: courseDoc.id, ...courseDoc.data() });
    } catch (error) {
        console.error('Errore nel recupero singolo corso:', error);
        res.status(500).json({ error: 'Errore interno del server nel recupero corso.' });
    }
});

// POST nuovo corso (Admin)
app.post('/api/courses', async (req, res) => {
    try {
        const newCourseData = req.body; // Firestore genererà l'ID
        const docRef = await db.collection('courses').add(newCourseData);
        res.status(201).json({ id: docRef.id, ...newCourseData });
    } catch (error) {
        console.error('Errore nella creazione corso:', error);
        res.status(500).json({ error: 'Errore interno del server nella creazione corso.' });
    }
});

// PUT aggiorna corso (Admin)
app.put('/api/courses/:id', async (req, res) => {
    try {
        const courseId = req.params.id;
        const updatedCourseData = req.body;
        // Non includere l'ID nel payload dell'update se già presente nell'URL
        delete updatedCourseData.id;

        await db.collection('courses').doc(courseId).update(updatedCourseData);
        res.json({ id: courseId, ...updatedCourseData });
    } catch (error) {
        console.error('Errore nell\'aggiornamento corso:', error);
        res.status(500).json({ error: 'Errore interno del server nell\'aggiornamento corso.' });
    }
});

// DELETE corso (Admin)
app.delete('/api/courses/:id', async (req, res) => {
    try {
        const courseIdToDelete = req.params.id;

        // Elimina il corso
        await db.collection('courses').doc(courseIdToDelete).delete();

        // Rimuovi il corso eliminato da tutti gli studenti
        const studentsRef = db.collection('students');
        const studentsSnapshot = await studentsRef.get(); // Ottieni tutti gli studenti

        const batch = db.batch(); // Usa un batch per aggiornamenti multipli efficienti

        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            if (studentData.assignedCourses && studentData.assignedCourses.includes(courseIdToDelete)) {
                const updatedAssignedCourses = studentData.assignedCourses.filter(courseId => courseId !== courseIdToDelete);
                batch.update(studentsRef.doc(doc.id), { assignedCourses: updatedAssignedCourses });
            }
        });

        await batch.commit(); // Esegui tutti gli aggiornamenti del batch

        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Errore nell\'eliminazione corso:', error);
        res.status(500).json({ error: 'Errore interno del server nell\'eliminazione corso.' });
    }
});


// --- API Studenti ---

// GET tutti gli studenti
app.get('/api/students', async (req, res) => {
    try {
        const studentsRef = db.collection('students');
        const snapshot = await studentsRef.get();
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(students);
    } catch (error) {
        console.error('Errore nel recupero studenti:', error);
        res.status(500).json({ error: 'Errore interno del server nel recupero studenti.' });
    }
});

// GET un singolo studente per ID
app.get('/api/students/:id', async (req, res) => {
    try {
        const studentDoc = await db.collection('students').doc(req.params.id).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ error: 'Studente non trovato.' });
        }
        res.json({ id: studentDoc.id, ...studentDoc.data() });
    } catch (error) {
        console.error('Errore nel recupero singolo studente:', error);
        res.status(500).json({ error: 'Errore interno del server nel recupero studente.' });
    }
});

// POST nuovo studente (Admin)
app.post('/api/students', async (req, res) => {
    try {
        const newStudentData = { assignedCourses: [], ...req.body }; // Firestore genererà l'ID

        // Controllo per email duplicata
        const existingStudentSnapshot = await db.collection('students').where('email', '==', newStudentData.email).limit(1).get();
        if (!existingStudentSnapshot.empty) {
            return res.status(400).json({ error: 'Email già esistente per un altro studente.' });
        }

        const docRef = await db.collection('students').add(newStudentData);
        res.status(201).json({ id: docRef.id, ...newStudentData });
    } catch (error) {
        console.error('Errore nella creazione studente:', error);
        res.status(500).json({ error: 'Errore interno del server nella creazione studente.' });
    }
});

// PUT aggiorna studente (Admin)
app.put('/api/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const updatedStudentData = req.body;
        // Non includere l'ID nel payload dell'update
        delete updatedStudentData.id;
        // Assicurati che assignedCourses non venga sovrascritto se non esplicitamente passato
        // In Firestore, un 'update' fa un merge, quindi se assignedCourses non è nel payload, non viene modificato.
        // Se invece vuoi resettarlo, devi esplicitamente passare un array vuoto.

        // Controllo per email duplicata (se l'email viene modificata)
        if (updatedStudentData.email) {
            const existingStudentSnapshot = await db.collection('students')
                .where('email', '==', updatedStudentData.email)
                .limit(1)
                .get();
            if (!existingStudentSnapshot.empty && existingStudentSnapshot.docs[0].id !== studentId) {
                return res.status(400).json({ error: 'Email già esistente per un altro studente.' });
            }
        }

        await db.collection('students').doc(studentId).update(updatedStudentData);
        res.json({ id: studentId, ...updatedStudentData });
    } catch (error) {
        console.error('Errore nell\'aggiornamento studente:', error);
        res.status(500).json({ error: 'Errore interno del server nell\'aggiornamento studente.' });
    }
});

// DELETE studente (Admin)
app.delete('/api/students/:id', async (req, res) => {
    try {
        const studentIdToDelete = req.params.id;

        // Elimina lo studente
        await db.collection('students').doc(studentIdToDelete).delete();

        // Rimuovi anche l'account utente associato a questo studente, se esiste
        const usersRef = db.collection('users');
        const userSnapshot = await usersRef.where('role', '==', 'student').where('studentId', '==', studentIdToDelete).get();

        const batch = db.batch(); // Usa un batch per aggiornamenti multipli efficienti

        userSnapshot.forEach(doc => {
            batch.delete(usersRef.doc(doc.id));
        });

        await batch.commit(); // Esegui tutti gli aggiornamenti del batch

        res.status(204).send(); // No Content
    } catch (error) {
        console.error('Errore nell\'eliminazione studente:', error);
        res.status(500).json({ error: 'Errore interno del server nell\'eliminazione studente.' });
    }
});

// API per assegnare corsi a uno studente
app.put('/api/students/:id/assign-courses', async (req, res) => {
    const { courseIds } = req.body; // courseIds dovrebbe essere un array di ID di corsi
    const studentId = req.params.id;

    if (!Array.isArray(courseIds)) {
        return res.status(400).json({ error: 'Il body della richiesta deve contenere un array di "courseIds".' });
    }

    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ error: 'Studente non trovato.' });
        }

        // Verifica che tutti i courseIds forniti esistano in Firestore (opzionale ma consigliato)
        const coursesSnapshot = await db.collection('courses').get();
        const existingCourseIds = new Set(coursesSnapshot.docs.map(doc => doc.id));
        const validCourseIds = courseIds.filter(id => existingCourseIds.has(id));

        if (validCourseIds.length !== courseIds.length) {
            console.warn('Alcuni courseIds forniti non corrispondono a corsi esistenti. Assegnati solo quelli validi.');
            // Puoi scegliere di restituire un errore 400 qui se vuoi essere più restrittivo
            // return res.status(400).json({ error: 'Alcuni ID corso non sono validi.' });
        }

        await db.collection('students').doc(studentId).update({ assignedCourses: validCourseIds });

        // Ottieni i dati aggiornati dello studente per la risposta
        const updatedStudentDoc = await db.collection('students').doc(studentId).get();
        res.json({ message: 'Corsi assegnati con successo.', student: { id: updatedStudentDoc.id, ...updatedStudentDoc.data() } });

    } catch (error) {
        console.error('Errore nell\'assegnazione corsi:', error);
        res.status(500).json({ error: 'Errore interno del server nell\'assegnazione corsi.' });
    }
});

// Route di fallback per tutte le altre richieste (serve login.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// Avvio del server
async function startServer() {
    // Non è più necessario initializePublicDirectory() qui perché Express gestisce già la cartella statica
    // E non è più necessario initializeDataFile() perché usiamo Firestore
    app.listen(PORT, () => {
        console.log(`Server Node.js in esecuzione su http://localhost:${PORT}`);
        console.log(`Pannello Amministratore: http://localhost:${PORT}/admin-dashboard.html`);
        console.log(`Login Studente: http://localhost:${PORT}/login.html`);
        console.log(`Credenziali Admin iniziali: Utente = admin, Password = adminpassword (se non hai cambiato le regole di sicurezza di Firestore per creare nuovi utenti)`);
        console.log(`Assicurati che 'serviceAccountKey.json' sia nella cartella principale del progetto.`);
    });
}

startServer();
