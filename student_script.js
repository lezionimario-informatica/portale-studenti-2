// Salva questo codice come student_script.js nella cartella 'public' (è per la student dashboard)

document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar .navigation ul li');
    const contentAreas = document.querySelectorAll('.main-content .content-area');
    const pageTitle = document.getElementById('page-title-student');
    const userDisplayName = document.getElementById('user-display-name-student');
    const logoutBtn = document.getElementById('logout-btn-student');

    // Elementi Dashboard Studente
    const totalAssignedCoursesEl = document.getElementById('total-assigned-courses');

    // Elementi I Miei Corsi
    const studentCoursesGrid = document.querySelector('.student-courses-grid');
    const videoModal = document.getElementById('video-modal');
    const videoTitleEl = document.getElementById('video-title');
    const videoEmbedContainer = document.getElementById('video-embed-container');
    const externalLinkBtn = document.getElementById('external-link-btn');

    let currentStudentData = null; // Variabile per tenere traccia dei dati dello studente loggato

    // Elementi per il modal di alert personalizzato
    const customAlertModal = document.getElementById('custom-alert-modal');
    const customAlertTitle = document.getElementById('custom-alert-title');
    const customAlertMessage = document.getElementById('custom-alert-message');
    const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
    const customAlertCancelBtn = document.getElementById('custom-alert-cancel-btn'); // Non usato, ma per consistenza

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

    // Funzione per ottenere l'ID dello studente da sessionStorage
    const getStudentIdFromStorage = () => {
        return sessionStorage.getItem('loggedInStudentId');
    };

    const loadStudentData = async () => {
        const studentId = getStudentIdFromStorage();
        if (!studentId) {
            console.error('ID studente non trovato. Reindirizzamento al login.');
            showMessageModal('Sessione Scaduta', 'La tua sessione è scaduta o non sei loggato. Effettua nuovamente il login.').then(() => {
                window.location.href = '/login.html';
            });
            return;
        }

        try {
            // Ottieni i dati di tutti gli utenti per trovare il nome visualizzato dell'utente corrente
            const usersRes = await fetch('/api/users');
            if (!usersRes.ok) throw new Error('Errore nel recupero degli utenti.');
            const users = await usersRes.json();
            const currentUser = users.find(u => u.role === 'student' && u.studentId === studentId);

            if (currentUser && currentUser.username) {
                userDisplayName.textContent = currentUser.username;
            } else {
                userDisplayName.textContent = 'Studente'; // Fallback
            }

            // Ottieni i dati dello studente (con corsi assegnati)
            const studentRes = await fetch(`/api/students/${studentId}`);
            if (!studentRes.ok) throw new Error('Dati studente non trovati.');
            currentStudentData = await studentRes.json();

            // Ottieni tutti i corsi
            const coursesRes = await fetch('/api/courses');
            if (!coursesRes.ok) throw new Error('Dati corsi non trovati.');
            const allCourses = await coursesRes.json();

            // Popola i corsi assegnati con i dettagli completi
            currentStudentData.assignedCoursesDetails = currentStudentData.assignedCourses
                .map(assignedCourseId => allCourses.find(c => c.id === assignedCourseId))
                .filter(Boolean); // Rimuovi eventuali corsi non trovati o null

            showSection('student-dashboard'); // Mostra la dashboard home
        } catch (error) {
            console.error('Errore nel caricamento dei dati dello studente o dei corsi:', error);
            showMessageModal('Errore di Caricamento', 'Errore nel caricamento dei dati. Effettua nuovamente il login.').then(() => {
                window.location.href = '/login.html';
            });
        }
    };

    // Funzione per mostrare una sezione e nascondere le altre
    const showSection = (sectionId) => {
        contentAreas.forEach(area => {
            area.classList.add('hidden');
        });
        document.getElementById(`${sectionId}-content`).classList.remove('hidden');
        pageTitle.textContent = document.querySelector(`[data-section="${sectionId}"] a`).textContent.trim();

        // Aggiorna classe 'active' nella sidebar
        sidebarLinks.forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

        // Carica i dati specifici per la sezione
        if (sectionId === 'student-dashboard') {
            updateDashboardSummary();
        } else if (sectionId === 'my-courses') {
            renderAssignedCourses();
        }
    };

    // Gestione click sidebar
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });

    // Funzione per chiudere tutti i modali
    const closeAllModals = () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        // Resetta l'iframe del video per fermare la riproduzione
        videoEmbedContainer.innerHTML = '';
        customAlertModal.style.display = 'none'; // Assicurati che anche il modal di alert si chiuda
    };

    // Gestione chiusura modali con la 'X'
    document.querySelectorAll('.modal .close-button').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Chiudi modali cliccando fuori dal contenuto
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // --- Logout ---
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('loggedInStudentId'); // Pulisci l'ID dalla sessione
        window.location.href = '/login.html'; // Reindirizza al login
    });

    // --- Aggiorna Riepilogo Dashboard Studente ---
    const updateDashboardSummary = () => {
        if (currentStudentData && currentStudentData.assignedCoursesDetails) {
            totalAssignedCoursesEl.textContent = currentStudentData.assignedCoursesDetails.length;
        } else {
            totalAssignedCoursesEl.textContent = '0'; // Se i dati non sono disponibili, mostra 0
        }
    };

    // --- Renderizza i Corsi Assegnati ---
    const renderAssignedCourses = () => {
        studentCoursesGrid.innerHTML = ''; // Pulisci la griglia esistente
        if (currentStudentData && currentStudentData.assignedCoursesDetails.length > 0) {
            currentStudentData.assignedCoursesDetails.forEach(course => {
                const courseCard = document.createElement('div');
                courseCard.classList.add('student-course-card');
                courseCard.innerHTML = `
                    <h3>${course.title}</h3>
                    <p>${course.description}</p>
                    <p>Settimana: ${course.week}</p>
                    <div class="course-actions">
                        <button class="view-course-btn" data-id="${course.id}">Vedi Contenuto</button>
                    </div>
                `;
                studentCoursesGrid.appendChild(courseCard);
            });
        } else {
            studentCoursesGrid.innerHTML = '<p>Nessun corso assegnato al momento. Contatta il tuo amministratore.</p>';
        }
    };

    // Delega eventi per i bottoni "Vedi Contenuto"
    studentCoursesGrid.addEventListener('click', async (e) => {
        if (e.target.classList.contains('view-course-btn')) {
            const courseId = e.target.dataset.id;
            try {
                // Trova il corso tra quelli già caricati
                const course = currentStudentData.assignedCoursesDetails.find(c => c.id === courseId);
                if (!course) {
                    throw new Error('Corso non trovato tra quelli assegnati.');
                }

                videoTitleEl.textContent = course.title;
                let embedHtml = '';
                if (course.videoUrl.includes('youtube.com/watch?v=')) {
                    const videoId = new URL(course.videoUrl).searchParams.get('v');
                    embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                } else if (course.videoUrl.includes('youtu.be/')) {
                    const videoId = course.videoUrl.split('youtu.be/')[1];
                    embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                } else if (course.videoUrl.includes('vimeo.com/')) {
                    const videoId = course.videoUrl.split('vimeo.com/')[1];
                    embedHtml = `<iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
                } else {
                    embedHtml = `<p>Formato video non supportato o URL non valido per l'embedding.</p>`;
                }
                videoEmbedContainer.innerHTML = embedHtml;

                if (course.externalLink) {
                    externalLinkBtn.href = course.externalLink;
                    externalLinkBtn.style.display = 'inline-block';
                } else {
                    externalLinkBtn.style.display = 'none';
                }

                videoModal.style.display = 'flex';

            } catch (error) {
                console.error('Errore durante la visualizzazione del contenuto del corso:', error);
                showMessageModal('Errore', 'Impossibile visualizzare il contenuto del corso. Riprova più tardi.');
            }
        }
    });

    // Inizializzazione: Carica i dati dello studente e mostra la dashboard
    loadStudentData();
});
