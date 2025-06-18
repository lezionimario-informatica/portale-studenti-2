// Salva questo codice come script.js nella cartella 'public' (è per l'admin dashboard)

document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar .navigation ul li');
    const contentAreas = document.querySelectorAll('.main-content .content-area');
    const pageTitle = document.getElementById('page-title');
    const userDisplayName = document.getElementById('user-display-name');
    const logoutBtn = document.getElementById('logout-btn');

    // Elementi Dashboard
    const totalStudentsEl = document.getElementById('total-students');
    const totalCoursesEl = document.getElementById('total-courses');

    // Elementi Gestione Corsi
    const addCourseBtn = document.getElementById('add-course-btn');
    const courseListDiv = document.querySelector('#courses-content .course-list');
    const courseFormModal = document.getElementById('course-form-modal');
    const courseForm = document.getElementById('course-form');
    const courseFormTitle = document.getElementById('course-form-title');
    const courseIdInput = document.getElementById('course-id');
    const courseTitleInput = document.getElementById('course-title');
    const courseDescriptionInput = document.getElementById('course-description');
    const courseVideoInput = document.getElementById('course-video');
    const courseLinkInput = document.getElementById('course-link');
    const courseWeekInput = document.getElementById('course-week');
    const submitCourseBtn = document.getElementById('submit-course-btn');
    const videoModal = document.getElementById('video-modal');
    const videoTitleEl = document.getElementById('video-title');
    const videoEmbedContainer = document.getElementById('video-embed-container');
    const externalLinkBtn = document.getElementById('external-link-btn');

    // Elementi Gestione Studenti
    const addStudentBtn = document.getElementById('add-student-btn');
    const studentTableBody = document.querySelector('#students-content .student-list tbody');
    const studentFormModal = document.getElementById('student-form-modal');
    const studentForm = document.getElementById('student-form');
    const studentFormTitle = document.getElementById('student-form-title');
    const studentIdInput = document.getElementById('student-id');
    const studentNameInput = document.getElementById('student-name');
    const studentEmailInput = document.getElementById('student-email');
    const submitStudentBtn = document.getElementById('submit-student-btn');
    const assignCoursesModal = document.getElementById('assign-courses-modal');
    const assignCoursesTitle = document.getElementById('assign-courses-title');
    const studentNameAssignEl = document.getElementById('student-name-assign');
    const coursesAssignmentList = document.querySelector('.courses-assignment-list');
    const saveAssignmentsBtn = document.getElementById('save-assignments-btn');

    let currentStudentIdToAssign = null; // ID dello studente su cui stiamo lavorando per l'assegnazione
    let allCourses = []; // Cache di tutti i corsi per l'assegnazione

    // Elementi per il modal di alert/conferma personalizzato
    const customAlertModal = document.getElementById('custom-alert-modal');
    const customAlertTitle = document.getElementById('custom-alert-title');
    const customAlertMessage = document.getElementById('custom-alert-message');
    const customAlertOkBtn = document.getElementById('custom-alert-ok-btn');
    const customAlertCancelBtn = document.getElementById('custom-alert-cancel-btn');

    // Funzione per mostrare un messaggio personalizzato (alert sostitutivo)
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

    // Funzione per mostrare un messaggio di conferma personalizzato
    const showConfirmationModal = (title, message) => {
        customAlertTitle.textContent = title;
        customAlertMessage.textContent = message;
        customAlertOkBtn.textContent = 'Sì';
        customAlertCancelBtn.textContent = 'No';
        customAlertOkBtn.style.display = 'inline-block';
        customAlertCancelBtn.style.display = 'inline-block'; // Mostra annulla per la conferma
        customAlertModal.style.display = 'flex';

        return new Promise(resolve => {
            customAlertOkBtn.onclick = () => {
                customAlertModal.style.display = 'none';
                resolve(true);
            };
            customAlertCancelBtn.onclick = () => {
                customAlertModal.style.display = 'none';
                resolve(false);
            };
        });
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
        if (sectionId === 'dashboard') {
            fetchDashboardSummary();
        } else if (sectionId === 'courses') {
            fetchCourses();
        } else if (sectionId === 'students') {
            fetchStudents();
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
        // Assicurati di nascondere il modal di alert/conferma
        customAlertModal.style.display = 'none';
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
        // In un'app reale, qui faresti una chiamata API per invalidare la sessione
        sessionStorage.removeItem('loggedInStudentId'); // Rimuovi qualsiasi ID studente se presente
        window.location.href = '/login.html'; // Reindirizza alla pagina di login
    });

    // --- Dashboard Summary ---
    const fetchDashboardSummary = async () => {
        try {
            const [studentsRes, coursesRes] = await Promise.all([
                fetch('/api/students'),
                fetch('/api/courses')
            ]);

            const students = await studentsRes.json();
            const courses = await coursesRes.json();

            totalStudentsEl.textContent = students.length;
            totalCoursesEl.textContent = courses.length;
        } catch (error) {
            console.error('Errore nel caricamento del riepilogo della dashboard:', error);
            totalStudentsEl.textContent = 'N/D';
            totalCoursesEl.textContent = 'N/D';
            showMessageModal('Errore', 'Impossibile caricare il riepilogo della dashboard. Riprova più tardi.');
        }
    };

    // --- Gestione Corsi ---

    const fetchCourses = async () => {
        try {
            const response = await fetch('/api/courses');
            if (!response.ok) throw new Error('Errore nel recupero dei corsi');
            const courses = await response.json();
            allCourses = courses; // Salva i corsi per l'assegnazione
            renderCourses(courses);
        } catch (error) {
            console.error('Errore nel caricamento dei corsi:', error);
            courseListDiv.innerHTML = '<p>Errore nel caricamento dei corsi. Riprova più tardi.</p>';
            showMessageModal('Errore', 'Impossibile caricare i corsi. Riprova più tardi.');
        }
    };

    const renderCourses = (courses) => {
        courseListDiv.innerHTML = ''; // Pulisci la lista esistente
        if (courses.length === 0) {
            courseListDiv.innerHTML = '<p>Nessun corso disponibile. Aggiungi un nuovo corso per iniziare!</p>';
            return;
        }
        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.classList.add('course-card');
            courseCard.innerHTML = `
                <h3>${course.title}</h3>
                <p>${course.description}</p>
                <p>Settimana: ${course.week}</p>
                <div class="course-actions">
                    <button class="view-course-btn" data-id="${course.id}">Vedi Corso</button>
                    <button class="edit" data-id="${course.id}">Modifica</button>
                    <button class="delete" data-id="${course.id}">Elimina</button>
                </div>
            `;
            courseListDiv.appendChild(courseCard);
        });
    };

    addCourseBtn.addEventListener('click', () => {
        courseForm.reset();
        courseIdInput.value = ''; // Campo nascosto per ID
        courseFormTitle.textContent = 'Aggiungi Corso';
        submitCourseBtn.textContent = 'Salva Corso';
        courseFormModal.style.display = 'flex';
    });

    courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = courseIdInput.value;
        const title = courseTitleInput.value;
        const description = courseDescriptionInput.value;
        const videoUrl = courseVideoInput.value;
        const externalLink = courseLinkInput.value;
        const week = parseInt(courseWeekInput.value);

        const courseData = { title, description, videoUrl, externalLink, week };
        let response;

        try {
            if (id) {
                // Modifica corso esistente
                response = await fetch(`/api/courses/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(courseData)
                });
            } else {
                // Aggiungi nuovo corso
                response = await fetch('/api/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(courseData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nel salvataggio del corso');
            }
            closeAllModals();
            await showMessageModal('Successo!', 'Corso salvato con successo.');
            fetchCourses(); // Ricarica la lista dei corsi
            fetchDashboardSummary(); // Aggiorna il conteggio
        } catch (error) {
            console.error('Errore nel salvataggio del corso:', error);
            showMessageModal('Errore', `Si è verificato un errore durante il salvataggio del corso: ${error.message}. Riprova.`);
        }
    });

    // Delega eventi per i bottoni dinamici (modifica, elimina, vedi)
    courseListDiv.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit')) {
            const courseId = e.target.dataset.id;
            try {
                const response = await fetch(`/api/courses/${courseId}`);
                if (!response.ok) throw new Error('Corso non trovato per modifica');
                const course = await response.json();

                courseIdInput.value = course.id;
                courseTitleInput.value = course.title;
                courseDescriptionInput.value = course.description;
                courseVideoInput.value = course.videoUrl;
                courseLinkInput.value = course.externalLink || '';
                courseWeekInput.value = course.week;

                courseFormTitle.textContent = 'Modifica Corso';
                submitCourseBtn.textContent = 'Salva Modifiche';
                courseFormModal.style.display = 'flex';
            } catch (error) {
                console.error('Errore nel caricamento del corso per modifica:', error);
                showMessageModal('Errore', 'Impossibile caricare il corso per la modifica. Riprova più tardi.');
            }
        } else if (e.target.classList.contains('delete')) {
            const courseId = e.target.dataset.id;
            const confirmed = await showConfirmationModal('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo corso? L\'operazione è irreversibile e lo rimuoverà da tutti gli studenti!');
            if (confirmed) {
                try {
                    const response = await fetch(`/api/courses/${courseId}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) throw new Error('Errore nell\'eliminazione del corso');
                    await showMessageModal('Successo!', 'Corso eliminato con successo.');
                    fetchCourses(); // Ricarica la lista
                    fetchDashboardSummary(); // Aggiorna il conteggio
                } catch (error) {
                    console.error('Errore nell\'eliminazione del corso:', error);
                    showMessageModal('Errore', `Si è verificato un errore durante l'eliminazione del corso: ${error.message}. Riprova.`);
                }
            }
        } else if (e.target.classList.contains('view-course-btn')) {
            const courseId = e.target.dataset.id;
            try {
                const response = await fetch(`/api/courses/${courseId}`);
                if (!response.ok) throw new Error('Corso non trovato per la visualizzazione');
                const course = await response.json();

                videoTitleEl.textContent = course.title;
                // Estrai l'ID del video YouTube o Vimeo e crea l'iframe
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
                console.error('Errore durante la visualizzazione del corso:', error);
                showMessageModal('Errore', 'Impossibile visualizzare il corso. Riprova più tardi.');
            }
        }
    });


    // --- Gestione Studenti ---

    const fetchStudents = async () => {
        try {
            const response = await fetch('/api/students');
            if (!response.ok) throw new Error('Errore nel recupero degli studenti');
            const students = await response.json();
            renderStudents(students);
        } catch (error) {
            console.error('Errore nel caricamento degli studenti:', error);
            studentTableBody.innerHTML = '<tr><td colspan="5">Errore nel caricamento degli studenti. Riprova più tardi.</td></tr>';
            showMessageModal('Errore', 'Impossibile caricare gli studenti. Riprova più tardi.');
        }
    };

    const renderStudents = (students) => {
        studentTableBody.innerHTML = ''; // Pulisci la tabella esistente
        if (students.length === 0) {
            studentTableBody.innerHTML = '<tr><td colspan="5">Nessuno studente registrato. Aggiungi un nuovo studente per iniziare!</td></tr>';
            return;
        }
        students.forEach(student => {
            const row = studentTableBody.insertRow();
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.assignedCourses.length}</td>
                <td class="action-buttons">
                    <button class="edit" data-id="${student.id}">Modifica</button>
                    <button class="delete" data-id="${student.id}">Elimina</button>
                    <button class="assign-courses-btn" data-id="${student.id}" data-name="${student.name}">Assegna Corsi</button>
                </td>
            `;
        });
    };

    addStudentBtn.addEventListener('click', () => {
        studentForm.reset();
        studentIdInput.value = '';
        studentFormTitle.textContent = 'Aggiungi Studente';
        submitStudentBtn.textContent = 'Salva Studente';
        studentFormModal.style.display = 'flex';
    });

    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = studentIdInput.value;
        const name = studentNameInput.value;
        const email = studentEmailInput.value;

        const studentData = { name, email };
        let response;

        try {
            if (id) {
                // Modifica studente esistente
                response = await fetch(`/api/students/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studentData)
                });
            } else {
                // Aggiungi nuovo studente
                response = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studentData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nel salvataggio dello studente');
            }
            closeAllModals();
            await showMessageModal('Successo!', 'Studente salvato con successo.');
            fetchStudents(); // Ricarica la lista studenti
            fetchDashboardSummary(); // Aggiorna il conteggio
        } catch (error) {
            console.error('Errore nel salvataggio dello studente:', error);
            showMessageModal('Errore', `Si è verificato un errore durante il salvataggio dello studente: ${error.message}. Riprova.`);
        }
    });

    studentTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit')) {
            const studentId = e.target.dataset.id;
            try {
                const response = await fetch(`/api/students/${studentId}`);
                if (!response.ok) throw new Error('Studente non trovato per modifica');
                const student = await response.json();

                studentIdInput.value = student.id;
                studentNameInput.value = student.name;
                studentEmailInput.value = student.email;

                studentFormTitle.textContent = 'Modifica Studente';
                submitStudentBtn.textContent = 'Salva Modifiche';
                studentFormModal.style.display = 'flex';
            } catch (error) {
                console.error('Errore nel caricamento dello studente per modifica:', error);
                showMessageModal('Errore', 'Impossibile caricare lo studente per la modifica. Riprova più tardi.');
            }
        } else if (e.target.classList.contains('delete')) {
            const studentId = e.target.dataset.id;
            const confirmed = await showConfirmationModal('Conferma Eliminazione', 'Sei sicuro di voler eliminare questo studente? L\'operazione è irreversibile e rimuoverà anche il suo account utente associato!');
            if (confirmed) {
                try {
                    const response = await fetch(`/api/students/${studentId}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) throw new Error('Errore nell\'eliminazione dello studente');
                    await showMessageModal('Successo!', 'Studente eliminato con successo.');
                    fetchStudents(); // Ricarica la lista
                    fetchDashboardSummary(); // Aggiorna il conteggio
                } catch (error) {
                    console.error('Errore nell\'eliminazione dello studente:', error);
                    showMessageModal('Errore', `Si è verificato un errore durante l'eliminazione dello studente: ${error.message}. Riprova.`);
                }
            }
        } else if (e.target.classList.contains('assign-courses-btn')) {
            currentStudentIdToAssign = e.target.dataset.id;
            const studentName = e.target.dataset.name;
            studentNameAssignEl.textContent = studentName;
            await populateAssignCoursesModal(currentStudentIdToAssign);
            assignCoursesModal.style.display = 'flex';
        }
    });

    const populateAssignCoursesModal = async (studentId) => {
        try {
            const [studentRes, coursesRes] = await Promise.all([
                fetch(`/api/students/${studentId}`),
                fetch('/api/courses')
            ]);

            if (!studentRes.ok) throw new Error('Studente non trovato per l\'assegnazione corsi.');
            if (!coursesRes.ok) throw new Error('Corsi non trovati per l\'assegnazione.');

            const student = await studentRes.json();
            const courses = await coursesRes.json();
            allCourses = courses; // Aggiorna la cache dei corsi

            coursesAssignmentList.innerHTML = ''; // Pulisci la lista
            if (courses.length === 0) {
                coursesAssignmentList.innerHTML = '<p>Nessun corso disponibile da assegnare. Aggiungi prima dei corsi nella sezione "Corsi".</p>';
                saveAssignmentsBtn.style.display = 'none';
                return;
            } else {
                saveAssignmentsBtn.style.display = 'inline-block';
            }

            courses.sort((a, b) => a.title.localeCompare(b.title)).forEach(course => {
                const isAssigned = student.assignedCourses.includes(course.id);
                const item = document.createElement('div');
                item.classList.add('course-assignment-item');
                item.innerHTML = `
                    <label>
                        <input type="checkbox" value="${course.id}" ${isAssigned ? 'checked' : ''}>
                        ${course.title} (Settimana: ${course.week})
                    </label>
                `;
                coursesAssignmentList.appendChild(item);
            });

        } catch (error) {
            console.error('Errore nel caricamento dei corsi per l\'assegnazione:', error);
            coursesAssignmentList.innerHTML = '<p>Errore nel caricamento dei corsi. Impossibile assegnare.</p>';
            showMessageModal('Errore', 'Impossibile caricare i corsi per l\'assegnazione. Riprova più tardi.');
        }
    };

    saveAssignmentsBtn.addEventListener('click', async () => {
        if (!currentStudentIdToAssign) {
            showMessageModal('Errore', 'Nessuno studente selezionato per l\'assegnazione.');
            return;
        }

        const assignedCourseIds = Array.from(coursesAssignmentList.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        try {
            const response = await fetch(`/api/students/${currentStudentIdToAssign}/assign-courses`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseIds: assignedCourseIds })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nel salvataggio delle assegnazioni.');
            }

            await showMessageModal('Successo!', 'Corsi assegnati con successo!');
            closeAllModals();
            fetchStudents(); // Ricarica la tabella studenti per aggiornare i conteggi
            currentStudentIdToAssign = null; // Resetta l'ID
        } catch (error) {
            console.error('Errore nel salvataggio delle assegnazioni:', error);
            showMessageModal('Errore', `Si è verificato un errore durante l'assegnazione dei corsi: ${error.message}. Riprova.`);
        }
    });

    // Inizializzazione: mostra la dashboard e carica i dati
    // Questa parte si attiva solo quando la dashboard viene caricata, non appena il DOM è pronto.
    // L'utente admin deve aver fatto il login per arrivare qui.
    // fetchDashboardSummary() e showSection('dashboard') vengono chiamati qui in base all'utente.
    // Potresti voler aggiungere una logica per verificare che l'utente sia effettivamente un admin
    // prima di mostrare questa dashboard, ad esempio controllando un token o una sessione.
    // Per ora, assumiamo che l'utente sia autenticato come admin se arriva su questa pagina.
    showSection('dashboard'); // Carica la sezione dashboard all'avvio della pagina admin
});

