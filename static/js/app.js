// VSTEP Portal - Application Logic

document.addEventListener("DOMContentLoaded", () => {
    // App State
    const state = {
        exams: {
            reading: [],
            listening: [],
            writing: [],
            speaking: []
        },
        currentCategory: null,
        currentExamId: null,
        currentExamData: null,
        userAnswers: {}, // Format: { questionId: selectedIndex }
        isSubmitted: false,
        
        // Media Recorder State (Speaking)
        mediaRecorder: null,
        audioChunks: [],
        recordingTimer: null,
        recordingSeconds: 0
    };

    // DOM Elements
    const elements = {
        themeToggle: document.getElementById("theme-toggle-btn"),
        logoHome: document.getElementById("btn-logo-home"),
        
        // Views
        dashboardView: document.getElementById("dashboard-view"),
        listView: document.getElementById("list-view"),
        examView: document.getElementById("exam-view"),
        
        // Counts
        readingCount: document.getElementById("reading-count"),
        listeningCount: document.getElementById("listening-count"),
        writingCount: document.getElementById("writing-count"),
        speakingCount: document.getElementById("speaking-count"),
        
        // Exam list
        listTitle: document.getElementById("list-title"),
        searchExamInput: document.getElementById("search-exam-input"),
        examsGridContainer: document.getElementById("exams-grid-container"),
        btnListBack: document.getElementById("btn-list-back"),
        
        // Exam practice
        examTitle: document.getElementById("exam-current-title"),
        examId: document.getElementById("exam-current-id"),
        examActionButtons: document.getElementById("exam-action-buttons"),
        examWorkspace: document.getElementById("exam-workspace-layout"),
        btnExamBack: document.getElementById("btn-exam-back"),
        
        // Offcanvas
        offcanvas: document.getElementById("offcanvas-panel"),
        offcanvasTitle: document.getElementById("offcanvas-title"),
        offcanvasClose: document.getElementById("offcanvas-close-btn"),
        offcanvasBody: document.getElementById("offcanvas-body-content")
    };

    // Initialize Lucide Icons
    lucide.createIcons();

    // 1. Theme Switcher (Dark/Light mode)
    elements.themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
    });

    // 2. Navigation Home
    elements.logoHome.addEventListener("click", () => {
        window.location.hash = "#/";
    });

    elements.btnListBack.addEventListener("click", () => {
        window.location.hash = "#/";
    });

    elements.btnExamBack.addEventListener("click", () => {
        window.location.hash = `#/list/${state.currentCategory}`;
    });

    // 3. Load counts & data from API
    async function loadDashboardData() {
        try {
            const response = await fetch("extracted_data/exams.json");
            if (!response.ok) throw new Error("Failed to fetch exams data");
            const data = await response.json();
            
            state.exams = data;
            
            // Update UI count numbers
            elements.readingCount.textContent = data.reading.length;
            elements.listeningCount.textContent = data.listening.length;
            elements.writingCount.textContent = data.writing.length;
            elements.speakingCount.textContent = data.speaking.length;
            
            // If the user lands directly on a list route, render the grid once data is available
            const hash = window.location.hash;
            if (hash.startsWith("#/list/")) {
                renderExamsGrid();
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }

    // 3.5. Hash Routing Controller
    async function handleRoute() {
        const hash = window.location.hash;
        
        // Handle list view: #/list/:category
        const listMatch = hash.match(/^#\/list\/([a-z]+)$/);
        if (listMatch) {
            const cat = listMatch[1];
            if (["reading", "listening", "writing", "speaking"].includes(cat)) {
                state.currentCategory = cat;
                const titles = {
                    reading: "Đề thi ĐỌC (Reading)",
                    listening: "Đề thi NGHE (Listening)",
                    writing: "Đề thi VIẾT (Writing)",
                    speaking: "Đề thi NÓI (Speaking)"
                };
                elements.listTitle.textContent = titles[cat];
                elements.searchExamInput.value = "";
                showView("list");
                return;
            }
        }
        
        // Handle exam view: #/exam/:category/:id
        const examMatch = hash.match(/^#\/exam\/([a-z]+)\/(\d+)$/);
        if (examMatch) {
            const cat = examMatch[1];
            const id = parseInt(examMatch[2]);
            if (["reading", "listening", "writing", "speaking"].includes(cat) && !isNaN(id)) {
                state.currentCategory = cat;
                if (state.currentExamId !== id || state.currentCategory !== cat || !state.currentExamData) {
                    await loadExam(cat, id);
                } else {
                    showView("exam");
                }
                return;
            }
        }
        
        // Default: dashboard view
        showView("dashboard");
    }

    // Listen for hash changes
    window.addEventListener("hashchange", handleRoute);

    // Initial load calls
    loadDashboardData();
    handleRoute();

    // 4. View Router Helper
    function showView(viewName) {
        // Hide all views
        elements.dashboardView.classList.remove("active");
        elements.listView.classList.remove("active");
        elements.examView.classList.remove("active");
        
        // Toggle body class for distraction-free exam layout
        if (viewName === "exam") {
            document.body.classList.add("in-exam");
        } else {
            document.body.classList.remove("in-exam");
        }
        
        // Stop any active recordings when leaving speaking exam
        stopSpeakingRecordingState();
        
        // Hide sentence tooltip
        const tooltip = document.getElementById("sentence-tooltip");
        if (tooltip) {
            tooltip.classList.remove("active");
            tooltip.style.display = "none";
        }
        
        if (viewName === "dashboard") {
            elements.dashboardView.classList.add("active");
        } else if (viewName === "list") {
            elements.listView.classList.add("active");
            renderExamsGrid();
        } else if (viewName === "exam") {
            elements.examView.classList.add("active");
        }
        
        // Refresh icons
        lucide.createIcons();
    }

    // 5. Grid list renderer
    document.querySelectorAll(".skill-card").forEach(card => {
        card.addEventListener("click", () => {
            const cat = card.getAttribute("data-category");
            window.location.hash = `#/list/${cat}`;
        });
    });

    function renderExamsGrid() {
        elements.examsGridContainer.innerHTML = "";
        const list = state.exams[state.currentCategory] || [];
        const query = elements.searchExamInput.value.toLowerCase().trim();
        
        const categoryIcons = {
            reading: "book-open",
            listening: "headphones",
            writing: "pen-tool",
            speaking: "mic"
        };
        
        const iconName = categoryIcons[state.currentCategory];
        
        list.forEach(id => {
            const label = `Đề số ${id}`;
            if (query && !label.toLowerCase().includes(query) && !id.toString().includes(query)) {
                return;
            }
            
            const card = document.createElement("div");
            card.className = "exam-list-card";
            card.innerHTML = `
                <div class="exam-card-icon">
                    <i data-lucide="${iconName}"></i>
                </div>
                <h4>${label}</h4>
                <div class="exam-card-footer">
                    <span class="badge">#${state.currentCategory.toUpperCase()}-${id}</span>
                    <span>Sẵn sàng <i data-lucide="chevron-right" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"></i></span>
                </div>
            `;
            
            card.addEventListener("click", () => {
                window.location.hash = `#/exam/${state.currentCategory}/${id}`;
            });
            
            elements.examsGridContainer.appendChild(card);
        });
        
        if (elements.examsGridContainer.children.length === 0) {
            elements.examsGridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">
                    Không tìm thấy đề thi phù hợp.
                </div>
            `;
        }
        
        lucide.createIcons();
    }

    elements.searchExamInput.addEventListener("input", renderExamsGrid);

    // 6. Load single exam content
    async function loadExam(category, id) {
        try {
            state.userAnswers = {};
            state.isSubmitted = false;
            state.currentExamId = id;
            state.userWritingAnswers = {};
            state.speakingRecordings = {};
            
            const response = await fetch(`extracted_data/${category}/${category}_${id}.json`);
            if (!response.ok) throw new Error("Failed to load exam details");
            const data = await response.json();
            
            state.currentExamData = data;
            
            // Set header title
            const categoryNames = {
                reading: "Luyện đề ĐỌC",
                listening: "Luyện đề NGHE",
                writing: "Luyện đề VIẾT",
                speaking: "Luyện đề NÓI"
            };
            elements.examTitle.textContent = `${categoryNames[category]} mã số ${id}`;
            elements.examId.textContent = `#${category.toUpperCase()}-${id}`;
            
            // Render workspace layout
            renderWorkspace(category, data);
            showView("exam");
        } catch (error) {
            console.error("Error loading exam:", error);
            alert("Lỗi tải đề thi: Đề thi này có thể chưa được cào dữ liệu hoặc lỗi kết nối.");
        }
    }

    // 7. Render layout based on Category
    function renderWorkspace(category, data) {
        elements.examActionButtons.innerHTML = "";
        elements.examWorkspace.innerHTML = "";
        
        if (category === "reading") {
            state.currentReadingPartIdx = 0;
            state.hoverTransActive = false;
            
            // Header Toggle buttons: Hover Translation Toggle
            const btnTranslation = document.createElement("button");
            btnTranslation.className = "btn-toggle-tool";
            btnTranslation.id = "btn-toggle-translation";
            btnTranslation.innerHTML = `<i data-lucide="languages"></i> Dịch tiếng Việt`;
            
            btnTranslation.onclick = () => {
                state.hoverTransActive = !state.hoverTransActive;
                const passagePanel = document.getElementById("passage-panel");
                
                if (state.hoverTransActive) {
                    btnTranslation.classList.add("active");
                    btnTranslation.style.backgroundColor = "var(--color-primary)";
                    btnTranslation.style.borderColor = "var(--color-primary)";
                    btnTranslation.style.color = "white";
                    if (passagePanel) {
                        passagePanel.classList.add("hover-trans-active");
                    }
                } else {
                    btnTranslation.classList.remove("active");
                    btnTranslation.style.backgroundColor = "";
                    btnTranslation.style.borderColor = "";
                    btnTranslation.style.color = "";
                    if (passagePanel) {
                        passagePanel.classList.remove("hover-trans-active");
                    }
                    const tooltip = document.getElementById("sentence-tooltip");
                    if (tooltip) {
                        tooltip.classList.remove("active");
                        tooltip.style.display = "none";
                    }
                }
            };
            elements.examActionButtons.appendChild(btnTranslation);
            
            // Build the tabs for Parts
            const tabsHtml = `
                <div class="reading-parts-tabs">
                    <button class="reading-part-tab-btn active" data-part-idx="0">Part 1</button>
                    <button class="reading-part-tab-btn" data-part-idx="1">Part 2</button>
                    <button class="reading-part-tab-btn" data-part-idx="2">Part 3</button>
                    <button class="reading-part-tab-btn" data-part-idx="3">Part 4</button>
                </div>
            `;
            
            // Reading Workspace (Left: Passage with tabs, Right: Questions grouped by part)
            elements.examWorkspace.innerHTML = `
                <div class="workspace-panel" id="passage-panel">
                    <h3 class="panel-title">Bài Đọc</h3>
                    ${tabsHtml}
                    <div class="passage-text" id="passage-text-content">
                        ${preparePassageHTML(data.parts[0].passage, data.parts[0].translation)}
                    </div>
                </div>
                
                <div class="workspace-panel" id="questions-panel">
                    <h3 class="panel-title">Câu Hỏi & Trả Lời</h3>
                    <div id="questions-container">
                        <div class="reading-part-questions-block" id="part-reading-questions-0" style="display: block;">
                            ${renderQuestions(data.parts[0].questions, 0)}
                        </div>
                        <div class="reading-part-questions-block" id="part-reading-questions-1" style="display: none;">
                            ${renderQuestions(data.parts[1].questions, 10)}
                        </div>
                        <div class="reading-part-questions-block" id="part-reading-questions-2" style="display: none;">
                            ${renderQuestions(data.parts[2].questions, 20)}
                        </div>
                        <div class="reading-part-questions-block" id="part-reading-questions-3" style="display: none;">
                            ${renderQuestions(data.parts[3].questions, 30)}
                        </div>
                    </div>
                    
                    <div class="exam-submit-area">
                        <div class="questions-progress" id="progress-container">
                            ${renderProgressDots(data.questions)}
                        </div>
                        <button class="btn-submit-exam" id="submit-quiz-btn">
                            <i data-lucide="check-circle-2"></i> Nộp Bài
                        </button>
                    </div>
                </div>
            `;
            
            state.switchReadingPart = function(partIdx) {
                if (state.currentReadingPartIdx === partIdx) return;
                state.currentReadingPartIdx = partIdx;
                
                // Update active tab styling
                document.querySelectorAll(".reading-part-tab-btn").forEach(btn => {
                    const btnIdx = parseInt(btn.getAttribute("data-part-idx"));
                    btn.classList.toggle("active", btnIdx === partIdx);
                });
                
                // Update passage content
                const passageTextContent = document.getElementById("passage-text-content");
                if (passageTextContent) {
                    passageTextContent.innerHTML = preparePassageHTML(data.parts[partIdx].passage, data.parts[partIdx].translation);
                }
                
                // Toggle visible question block
                for (let i = 0; i < 4; i++) {
                    const block = document.getElementById(`part-reading-questions-${i}`);
                    if (block) {
                        block.style.display = (i === partIdx) ? "block" : "none";
                    }
                }
            };
            
            // Set up click listeners for the tabs
            document.querySelectorAll(".reading-part-tab-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const idx = parseInt(btn.getAttribute("data-part-idx"));
                    state.switchReadingPart(idx);
                });
            });
            
            // Setup quiz submit listener
            document.getElementById("submit-quiz-btn").onclick = submitQuiz;
            setupAnswerListeners();
            addWorkspaceTabs("reading");
            
            // Setup hover events for sentences using event delegation on #passage-panel
            const passagePanel = document.getElementById("passage-panel");
            const tooltip = document.getElementById("sentence-tooltip");
            
            if (passagePanel && tooltip) {
                passagePanel.addEventListener("mouseover", (e) => {
                    if (!state.hoverTransActive) return;
                    
                    const target = e.target.closest(".trans-sentence");
                    if (!target) return;
                    
                    const idx = parseInt(target.getAttribute("data-sentence-idx"));
                    const sentences = state.currentTranslationSentences || [];
                    
                    const translatedText = sentences[Math.min(idx, sentences.length - 1)] || "";
                    if (!translatedText) return;
                    
                    tooltip.textContent = translatedText;
                    tooltip.style.display = "block";
                    
                    const rect = target.getBoundingClientRect();
                    const tooltipHeight = tooltip.offsetHeight;
                    const tooltipWidth = tooltip.offsetWidth;
                    
                    let top = rect.top + window.scrollY - tooltipHeight - 8;
                    if (rect.top - tooltipHeight - 8 < 0) {
                        top = rect.bottom + window.scrollY + 8;
                    }
                    
                    let left = rect.left + rect.width / 2 + window.scrollX;
                    const margin = 10;
                    const minLeft = tooltipWidth / 2 + margin;
                    const maxLeft = window.innerWidth - tooltipWidth / 2 - margin;
                    left = Math.max(minLeft, Math.min(left, maxLeft));
                    
                    tooltip.style.left = `${left}px`;
                    tooltip.style.top = `${top}px`;
                    tooltip.classList.add("active");
                });
                
                passagePanel.addEventListener("mouseout", (e) => {
                    const target = e.target.closest(".trans-sentence");
                    if (!target) return;
                    
                    tooltip.classList.remove("active");
                    tooltip.style.display = "none";
                });
            }
            
        } else if (category === "listening") {
            state.currentListeningPartIdx = 0;
            
            // Header Toggle buttons: Transcript & Translation
            const btnTranscript = document.createElement("button");
            btnTranscript.className = "btn-toggle-tool";
            btnTranscript.innerHTML = `<i data-lucide="file-text"></i> Xem Transcript`;
            btnTranscript.onclick = () => {
                const partIdx = state.currentListeningPartIdx || 0;
                showTranslation(data.parts[partIdx].transcript, "Bản Transcript tiếng Anh");
            };
            elements.examActionButtons.appendChild(btnTranscript);
            
            const btnTranslation = document.createElement("button");
            btnTranslation.className = "btn-toggle-tool";
            btnTranslation.innerHTML = `<i data-lucide="languages"></i> Dịch tiếng Việt`;
            btnTranslation.onclick = () => {
                const partIdx = state.currentListeningPartIdx || 0;
                showTranslation(data.parts[partIdx].translation);
            };
            elements.examActionButtons.appendChild(btnTranslation);
            
            // Build the tabs for Parts
            const tabsHtml = `
                <div class="reading-parts-tabs">
                    <button class="listening-part-tab-btn active" data-part-idx="0">Part 1</button>
                    <button class="listening-part-tab-btn" data-part-idx="1">Part 2</button>
                    <button class="listening-part-tab-btn" data-part-idx="2">Part 3</button>
                </div>
            `;
            
            // Get final audio URL for a part
            const getAudioUrlForPart = (partIdx) => {
                const partAudio = data.parts[partIdx].audio_url;
                return partAudio.startsWith("http") 
                    ? partAudio 
                    : `https://luyenthivstep.vn${partAudio}`;
            };
            
            // Listening Workspace (Left: Audio player with tabs, Right: Questions grouped by part)
            elements.examWorkspace.innerHTML = `
                <div class="workspace-panel" id="listening-left-panel" style="flex: 0.4;">
                    <h3 class="panel-title">Nghe Audio</h3>
                    ${tabsHtml}
                    <div class="audio-player-wrapper">
                        <div class="audio-label">
                            <i data-lucide="volume-2" class="text-primary"></i> <span>Audio bài nghe:</span>
                        </div>
                        <audio id="listening-audio-element" controls src="${getAudioUrlForPart(0)}"></audio>
                    </div>
                    <p style="color:var(--text-secondary); font-size:0.925rem; margin-top: 1rem;">
                        Hãy chọn Part tương ứng, nhấn nút phát âm thanh bên trên và nghe kỹ để hoàn thành các câu hỏi trắc nghiệm ở cột bên phải. Bạn có thể mở <strong>Transcript</strong> hoặc <strong>Bản dịch</strong> ở góc trên bên phải để hỗ trợ trong quá trình luyện tập.
                    </p>
                </div>
                
                <div class="workspace-panel" id="questions-panel" style="flex: 0.6;">
                    <h3 class="panel-title">Câu Hỏi & Trả Lời</h3>
                    <div id="questions-container">
                        <div class="listening-part-questions-block" id="part-listening-questions-0" style="display: block;">
                            ${renderQuestions(data.parts[0].questions, 0)}
                        </div>
                        <div class="listening-part-questions-block" id="part-listening-questions-1" style="display: none;">
                            ${renderQuestions(data.parts[1].questions, 8)}
                        </div>
                        <div class="listening-part-questions-block" id="part-listening-questions-2" style="display: none;">
                            ${renderQuestions(data.parts[2].questions, 20)}
                        </div>
                    </div>
                    
                    <div class="exam-submit-area">
                        <div class="questions-progress" id="progress-container">
                            ${renderProgressDots(data.questions)}
                        </div>
                        <button class="btn-submit-exam" id="submit-quiz-btn">
                            <i data-lucide="check-circle-2"></i> Nộp Bài
                        </button>
                    </div>
                </div>
            `;
            
            // Define switchListeningPart
            state.switchListeningPart = function(partIdx) {
                if (state.currentListeningPartIdx === partIdx) return;
                state.currentListeningPartIdx = partIdx;
                
                // Update active tab styling
                document.querySelectorAll(".listening-part-tab-btn").forEach(btn => {
                    const btnIdx = parseInt(btn.getAttribute("data-part-idx"));
                    btn.classList.toggle("active", btnIdx === partIdx);
                });
                
                // Update audio player source
                const audioElement = document.getElementById("listening-audio-element");
                if (audioElement) {
                    audioElement.src = getAudioUrlForPart(partIdx);
                    audioElement.pause();
                    audioElement.load();
                }
                
                // Toggle visible question block
                for (let i = 0; i < 3; i++) {
                    const block = document.getElementById(`part-listening-questions-${i}`);
                    if (block) {
                        block.style.display = (i === partIdx) ? "block" : "none";
                    }
                }
            };
            
            // Set up click listeners for the tabs
            document.querySelectorAll(".listening-part-tab-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const idx = parseInt(btn.getAttribute("data-part-idx"));
                    state.switchListeningPart(idx);
                });
            });
            
            document.getElementById("submit-quiz-btn").onclick = submitQuiz;
            setupAnswerListeners();
            addWorkspaceTabs("listening");
            
        } else if (category === "writing") {
            state.currentWritingTaskIdx = 0;
            state.userWritingAnswers = {};
            
            // Header: Translation
            const btnTranslation = document.createElement("button");
            btnTranslation.className = "btn-toggle-tool";
            btnTranslation.innerHTML = `<i data-lucide="languages"></i> Dịch tiếng Việt`;
            elements.examActionButtons.appendChild(btnTranslation);
            
            let sampleParagraph = "";
            
            // Build the tabs for Tasks
            const tabsHtml = `
                <div class="reading-parts-tabs">
                    <button class="writing-task-tab-btn active" data-task-idx="0">Task 1</button>
                    <button class="writing-task-tab-btn" data-task-idx="1">Task 2</button>
                </div>
            `;
            
            // Render workspace layout container
            elements.examWorkspace.innerHTML = `
                <div class="workspace-panel" id="writing-prompt-panel" style="flex: 0.45;">
                    <h3 class="panel-title">Yêu Cầu Đề Bài</h3>
                    ${tabsHtml}
                    <div class="writing-prompt-card" id="writing-prompt-content">
                    </div>
                </div>
                
                <div class="workspace-panel" id="writing-sheet-panel" style="flex: 0.55;">
                </div>
            `;
            
            // Helper B2 Mode functions (cloze & sentence recall)
            const keyPhrases = [
                "In recent years", "This problem has affected", "The rise of",
                "resulted from", "The challenge, therefore, is", "discussing the possible causes",
                "proposing solutions", "address this issue", "Give reasons", "relevant examples",
                "It is commonly believed", "On the one hand", "On the other hand", "First and foremost",
                "In addition", "For instance", "As a result", "In conclusion", "I would argue that",
                "take steps", "First of all", "Furthermore", "To begin with", "Last but not least",
                "Personally", "In my opinion", "From my perspective", "Consequently", "Therefore",
                "However", "Nevertheless", "Although", "Despite", "In contrast", "Conversely",
                "Lots of love", "Dear", "Sincerely", "Best regards", "I am writing to",
                "I look forward to", "Thank you for", "Please let me know if", "I hope you are doing well",
                "leave for Dubai", "be back", "experience looking after", "care for your pet", "household duties"
            ];
            
            function initClozePractice() {
                const phrases = [...keyPhrases].sort((a, b) => b.length - a.length);
                let processedText = sampleParagraph;
                const matches = [];
                let matchIndex = 0;
                
                phrases.forEach(phrase => {
                    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
                    processedText = processedText.replace(regex, (match) => {
                        const idx = matchIndex++;
                        matches.push({
                            index: idx,
                            originalText: match,
                            phrase: phrase
                        });
                        return `[INPUT_${idx}]`;
                    });
                });
                
                let html = processedText;
                matches.forEach(item => {
                    const inputWidth = Math.max(90, item.originalText.length * 8.5);
                    html = html.replace(`[INPUT_${item.index}]`, `<input type="text" class="cloze-input" data-idx="${item.index}" style="width: ${inputWidth}px;" placeholder="..."><span class="cloze-correct-hint" id="cloze-hint-${item.index}" style="display:none;"></span>`);
                });
                
                const area = document.getElementById("cloze-practice-area");
                if (area) {
                    area.innerHTML = html.split("\n").map(para => `<p>${para}</p>`).join("");
                }
                
                const btnCheck = document.getElementById("btn-check-cloze");
                const scoreDisplay = document.getElementById("cloze-score-display");
                
                if (btnCheck) {
                    btnCheck.onclick = () => {
                        let score = 0;
                        const inputs = area.querySelectorAll(".cloze-input");
                        inputs.forEach(input => {
                            const idx = parseInt(input.getAttribute("data-idx"));
                            const item = matches.find(m => m.index === idx);
                            const userVal = input.value.trim().toLowerCase();
                            const expectedVal = item.originalText.trim().toLowerCase();
                            
                            const cleanVal = (s) => s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
                            
                            if (cleanVal(userVal) === cleanVal(expectedVal)) {
                                input.className = "cloze-input correct";
                                score++;
                            } else {
                                input.className = "cloze-input incorrect";
                                const hint = document.getElementById(`cloze-hint-${idx}`);
                                if (hint) {
                                    hint.textContent = ` (${item.originalText})`;
                                    hint.style.display = "inline";
                                }
                            }
                        });
                        
                        if (scoreDisplay) {
                            scoreDisplay.innerHTML = `Độ chính xác: <strong>${score}/${inputs.length}</strong> cụm từ.`;
                        }
                    };
                }
            }
            
            function initRecallPractice() {
                const sentences = sampleParagraph.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
                const area = document.getElementById("recall-practice-area");
                if (!area) return;
                
                const getPreviewText = (sentence) => {
                    const words = sentence.split(/\s+/);
                    if (words.length <= 3) return sentence;
                    return words.slice(0, 3).join(" ") + "...";
                };
                
                let recallHtml = "";
                sentences.forEach((sentence, idx) => {
                    const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
                    recallHtml += `
                        <div class="sentence-recall-card" id="recall-card-${idx}">
                            <div class="sentence-recall-header" data-idx="${idx}">
                                <div class="sentence-title-area">
                                    <span class="sentence-number-badge">${idx + 1}</span>
                                    <span class="sentence-text-preview" id="sentence-preview-${idx}">
                                        ${getPreviewText(sentence)}
                                    </span>
                                </div>
                                <div class="sentence-meta-area">
                                    <span>${wordCount} từ</span>
                                    <span class="sentence-status-icon" id="recall-status-${idx}"><i data-lucide="circle" style="width:14px;height:14px;"></i></span>
                                </div>
                            </div>
                            
                            <div class="sentence-recall-body">
                                <textarea class="sentence-recall-textarea" id="recall-textarea-${idx}" placeholder="Viết lại câu này tại đây..."></textarea>
                                
                                <div class="sentence-recall-controls">
                                    <button class="btn-recall-check" data-idx="${idx}"><i data-lucide="check"></i> Kiểm tra</button>
                                    <button class="btn-recall-hint btn-hint-letters" data-idx="${idx}"><i data-lucide="type"></i> Ký tự đầu</button>
                                    <button class="btn-recall-hint btn-hint-scrambled" data-idx="${idx}"><i data-lucide="shuffle"></i> Từ xáo trộn</button>
                                </div>
                                
                                <div class="hint-display-box" id="hint-box-${idx}"></div>
                                <div class="diff-output-box" id="diff-box-${idx}"></div>
                            </div>
                        </div>
                    `;
                });
                
                area.innerHTML = recallHtml;
                
                // Accordion click handlers
                const headers = area.querySelectorAll(".sentence-recall-header");
                headers.forEach(header => {
                    header.onclick = () => {
                        const idx = parseInt(header.getAttribute("data-idx"));
                        const card = document.getElementById(`recall-card-${idx}`);
                        const isActive = card.classList.contains("active-card");
                        
                        area.querySelectorAll(".sentence-recall-card").forEach(c => c.classList.remove("active-card"));
                        
                        if (!isActive) {
                            card.classList.add("active-card");
                            setTimeout(() => {
                                const textarea = document.getElementById(`recall-textarea-${idx}`);
                                if (textarea) textarea.focus();
                            }, 50);
                        }
                    };
                });
                
                // Hint letter handlers
                const btnLetters = area.querySelectorAll(".btn-hint-letters");
                btnLetters.forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation(); // prevent accordion toggle
                        const idx = parseInt(btn.getAttribute("data-idx"));
                        const hintBox = document.getElementById(`hint-box-${idx}`);
                        const sentence = sentences[idx];
                        const hintText = getFirstLetterHint(sentence);
                        
                        hintBox.className = "hint-display-box active";
                        hintBox.innerHTML = `
                            <div class="hint-title">Gợi ý chữ cái đầu</div>
                            <div class="first-letter-text">${hintText}</div>
                        `;
                    };
                });
                
                // Hint scrambled handlers
                const btnScrambled = area.querySelectorAll(".btn-hint-scrambled");
                btnScrambled.forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation(); // prevent accordion toggle
                        const idx = parseInt(btn.getAttribute("data-idx"));
                        const hintBox = document.getElementById(`hint-box-${idx}`);
                        const sentence = sentences[idx];
                        const scrambled = getScrambledWords(sentence);
                        
                        const badgesHtml = scrambled.map(word => `<span class="scrambled-word-badge">${word}</span>`).join("");
                        
                        hintBox.className = "hint-display-box active";
                        hintBox.innerHTML = `
                            <div class="hint-title">Gợi ý từ xáo trộn</div>
                            <div class="scrambled-words-list">${badgesHtml}</div>
                        `;
                    };
                });
                
                // Check answers handlers
                const btnCheck = area.querySelectorAll(".btn-recall-check");
                btnCheck.forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation(); // prevent accordion toggle
                        const idx = parseInt(btn.getAttribute("data-idx"));
                        const sentence = sentences[idx];
                        const textarea = document.getElementById(`recall-textarea-${idx}`);
                        const userText = textarea.value.trim();
                        
                        if (!userText) {
                            alert("Vui lòng nhập câu trả lời trước khi kiểm tra!");
                            return;
                        }
                        
                        const score = calculateSimilarity(userText.toLowerCase(), sentence.toLowerCase());
                        const diff = diffWords(sentence, userText);
                        
                        const diffBox = document.getElementById(`diff-box-${idx}`);
                        diffBox.className = "diff-output-box active";
                        
                        const pct = Math.round(score * 100);
                        let badgeClass = "poor-match";
                        if (pct >= 90) badgeClass = "match";
                        else if (pct >= 60) badgeClass = "near-match";
                        
                        const diffHtml = diff.map(item => {
                            let itemClass = "correct";
                            if (item.type === "missing") itemClass = "missing";
                            else if (item.type === "inserted") itemClass = "inserted";
                            return `<span class="diff-w ${itemClass}">${item.word}</span>`;
                        }).join("");
                        
                        diffBox.innerHTML = `
                            <div class="diff-header">
                                <span class="diff-title">So khớp</span>
                                <span class="diff-score-badge ${badgeClass}">Khớp: ${pct}%</span>
                            </div>
                            <div class="diff-content">
                                ${diffHtml}
                            </div>
                        `;
                        
                        const card = document.getElementById(`recall-card-${idx}`);
                        const statusIcon = document.getElementById(`recall-status-${idx}`);
                        
                        if (pct >= 90) {
                            card.classList.add("completed-card");
                            statusIcon.className = "sentence-status-icon completed";
                            statusIcon.innerHTML = `<i data-lucide="check-circle" style="width:14px;height:14px;"></i>`;
                        } else {
                            card.classList.remove("completed-card");
                            statusIcon.className = "sentence-status-icon";
                            statusIcon.innerHTML = `<i data-lucide="circle" style="width:14px;height:14px;"></i>`;
                        }
                        lucide.createIcons();
                    };
                });
            }
            
            const switchWritingTask = (taskIdx) => {
                // Save current writing answer if textarea exists
                const oldTextarea = document.getElementById("user-writing-area");
                if (oldTextarea) {
                    state.userWritingAnswers[state.currentWritingTaskIdx] = oldTextarea.value;
                }
                
                state.currentWritingTaskIdx = taskIdx;
                
                // Update active tab styling
                document.querySelectorAll(".writing-task-tab-btn").forEach(btn => {
                    const btnIdx = parseInt(btn.getAttribute("data-task-idx"));
                    btn.classList.toggle("active", btnIdx === taskIdx);
                });
                
                // Update prompt text
                const promptContent = document.getElementById("writing-prompt-content");
                if (promptContent) {
                    promptContent.innerHTML = formatParagraphs(cleanQuestionText(data.parts[taskIdx].question));
                }
                
                // Extract the sample B2 paragraph for the active task
                sampleParagraph = extractSampleWriting(data.parts[taskIdx].question);
                
                const minWords = taskIdx === 0 ? 120 : 250;
                const savedText = state.userWritingAnswers[taskIdx] || "";
                
                // Update translation action
                btnTranslation.onclick = () => showTranslation(data.parts[taskIdx].translation);
                
                // Render modelPracticeHtml
                let modelPracticeHtml = "";
                if (sampleParagraph) {
                    modelPracticeHtml = `
                        <div class="practice-mode-selector">
                            <button class="mode-select-btn active" id="btn-mode-cloze">Điền cụm từ B2</button>
                            <button class="mode-select-btn" id="btn-mode-recall">Gợi nhớ từng câu</button>
                        </div>
                        <div class="practice-mode-container active" id="mode-container-cloze">
                            <div class="cloze-instruction"><strong>Hướng dẫn:</strong> Điền các liên từ hoặc cụm từ B2 thích hợp vào ô trống dưới đây để hoàn thiện đoạn văn mẫu.</div>
                            <div class="cloze-paragraph" id="cloze-practice-area"></div>
                            <div class="cloze-actions">
                                <button class="btn-cloze-check" id="btn-check-cloze"><i data-lucide="check-circle"></i> Kiểm tra đáp án</button>
                                <div id="cloze-score-display"></div>
                            </div>
                        </div>
                        <div class="practice-mode-container" id="mode-container-recall">
                            <div class="cloze-instruction"><strong>Hướng dẫn:</strong> Bấm vào từng câu để tập luyện viết gợi nhớ. Bạn có thể sử dụng các gợi ý để hỗ trợ viết lại chính xác từng câu.</div>
                            <div class="sentence-recall-list" id="recall-practice-area"></div>
                        </div>
                    `;
                } else {
                    modelPracticeHtml = `
                        <div class="empty-model-warning">
                            <i data-lucide="alert-circle"></i>
                            <p>Đề thi này hiện chưa có bài mẫu B2 để thực hành. Bạn hãy luyện tập viết tự do ở tab bên cạnh.</p>
                        </div>
                    `;
                }
                
                // Re-render sheet panel content
                const sheetPanel = document.getElementById("writing-sheet-panel");
                sheetPanel.innerHTML = `
                    <h3 class="panel-title">Bài Làm Của Bạn (Part ${taskIdx + 1})</h3>
                    
                    <div class="writing-tabs">
                        <button class="writing-tab-btn active" id="tab-btn-free"><i data-lucide="pen-tool"></i> Tự do viết</button>
                        <button class="writing-tab-btn" id="tab-btn-model"><i data-lucide="sparkles"></i> Luyện theo mẫu B2</button>
                    </div>
                    
                    <div class="writing-tab-content active" id="tab-content-free">
                        <div class="writing-sheet-card">
                            <textarea class="writing-textarea" id="user-writing-area" placeholder="Nhập bài viết của bạn tại đây (ít nhất ${minWords} từ)...">${savedText}</textarea>
                            
                            <div class="writing-footer">
                                <span>Kéo góc dưới bên phải để mở rộng khung viết</span>
                                <span class="word-count-badge" id="word-count-display">0 từ</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="writing-tab-content" id="tab-content-model">
                        ${modelPracticeHtml}
                    </div>
                `;
                
                // Set up tab click listeners for the sheet panel
                const tabBtnFree = document.getElementById("tab-btn-free");
                const tabBtnModel = document.getElementById("tab-btn-model");
                const tabContentFree = document.getElementById("tab-content-free");
                const tabContentModel = document.getElementById("tab-content-model");
                
                if (tabBtnFree && tabBtnModel) {
                    tabBtnFree.onclick = () => {
                        tabBtnFree.classList.add("active");
                        tabBtnModel.classList.remove("active");
                        tabContentFree.classList.add("active");
                        tabContentModel.classList.remove("active");
                    };
                    
                    tabBtnModel.onclick = () => {
                        tabBtnModel.classList.add("active");
                        tabBtnFree.classList.remove("active");
                        tabContentModel.classList.add("active");
                        tabContentFree.classList.remove("active");
                        lucide.createIcons();
                    };
                }
                
                // Live word counting logic
                const textarea = document.getElementById("user-writing-area");
                const wordCounter = document.getElementById("word-count-display");
                
                const updateWordCount = () => {
                    const text = textarea.value.trim();
                    const words = text === "" ? 0 : text.split(/\s+/).length;
                    wordCounter.textContent = `${words} từ`;
                    if (words >= minWords) {
                        wordCounter.classList.add("sufficient");
                    } else {
                        wordCounter.classList.remove("sufficient");
                    }
                };
                
                textarea.addEventListener("input", updateWordCount);
                updateWordCount();
                
                // Re-bind B2 model practice paragraphs if sampleParagraph exists
                if (sampleParagraph) {
                    const btnModeCloze = document.getElementById("btn-mode-cloze");
                    const btnModeRecall = document.getElementById("btn-mode-recall");
                    const containerCloze = document.getElementById("mode-container-cloze");
                    const containerRecall = document.getElementById("mode-container-recall");
                    
                    btnModeCloze.onclick = () => {
                        btnModeCloze.classList.add("active");
                        btnModeRecall.classList.remove("active");
                        containerCloze.classList.add("active");
                        containerRecall.classList.remove("active");
                    };
                    
                    btnModeRecall.onclick = () => {
                        btnModeRecall.classList.add("active");
                        btnModeCloze.classList.remove("active");
                        containerRecall.classList.add("active");
                        containerCloze.classList.remove("active");
                    };
                    
                    initClozePractice();
                    initRecallPractice();
                }
                
                lucide.createIcons();
            };

            // Set up click listeners for the tasks tabs
            setTimeout(() => {
                document.querySelectorAll(".writing-task-tab-btn").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const idx = parseInt(btn.getAttribute("data-task-idx"));
                        switchWritingTask(idx);
                    });
                });
            }, 0);
            
            switchWritingTask(0);
            addWorkspaceTabs("writing");
            
        } else if (category === "speaking") {
            state.currentSpeakingPartIdx = 0;
            
            // Header: Translation
            const btnTranslation = document.createElement("button");
            btnTranslation.className = "btn-toggle-tool";
            btnTranslation.innerHTML = `<i data-lucide="languages"></i> Dịch tiếng Việt`;
            elements.examActionButtons.appendChild(btnTranslation);
            
            // Build the tabs for Parts
            const tabsHtml = `
                <div class="reading-parts-tabs">
                    <button class="speaking-part-tab-btn active" data-part-idx="0">Part 1</button>
                    <button class="speaking-part-tab-btn" data-part-idx="1">Part 2</button>
                    <button class="speaking-part-tab-btn" data-part-idx="2">Part 3</button>
                </div>
            `;
            
            // Speaking Workspace
            elements.examWorkspace.innerHTML = `
                <div class="workspace-panel" id="speaking-prompt-panel" style="flex: 0.55;">
                    <h3 class="panel-title">Chủ Đề Nói (Prompts)</h3>
                    ${tabsHtml}
                    <div class="speaking-prompt-text" id="speaking-prompt-content">
                    </div>
                </div>
                
                <div class="workspace-panel" id="speaking-recorder-panel" style="flex: 0.45; align-items: center; justify-content: center;">
                    <h3 class="panel-title" style="width: 100%; align-self: flex-start;">Ghi Âm Bài Nói</h3>
                    <div class="recorder-card" style="background: transparent; border: none; box-shadow: none; padding: 0; flex: 1; display: flex; flex-direction: column; justify-content: center; width: 100%;">
                        <div class="recording-mic-visualizer" id="mic-visualizer">
                            <i data-lucide="mic"></i>
                        </div>
                        
                        <div class="recorder-status-text" id="record-status">Sẵn sàng thu âm</div>
                        <div class="recorder-timer" id="record-timer">00:00</div>
                        
                        <div class="recorder-controls">
                            <button class="btn-recorder btn-record-start" id="btn-start-record">
                                <i data-lucide="play"></i> Bắt đầu ghi âm
                            </button>
                            <button class="btn-recorder btn-record-stop" id="btn-stop-record" style="display:none;">
                                <i data-lucide="square"></i> Dừng ghi âm
                            </button>
                        </div>
                        
                        <div id="playback-container" style="width:100%; display:flex; justify-content:center;">
                        </div>
                    </div>
                </div>
            `;
            
            const switchSpeakingPart = (partIdx) => {
                // Stop current recording if any active recorder exists
                stopSpeakingRecording();
                
                state.currentSpeakingPartIdx = partIdx;
                
                // Update tabs active styling
                document.querySelectorAll(".speaking-part-tab-btn").forEach(btn => {
                    const btnIdx = parseInt(btn.getAttribute("data-part-idx"));
                    btn.classList.toggle("active", btnIdx === partIdx);
                });
                
                // Update prompt text
                const promptContent = document.getElementById("speaking-prompt-content");
                if (promptContent) {
                    promptContent.innerHTML = formatParagraphs(cleanQuestionText(data.parts[partIdx].question));
                }
                
                // Update translation action
                btnTranslation.onclick = () => showTranslation(data.parts[partIdx].translation);
                
                // Update recorder card state from saved recording if any
                const savedRec = state.speakingRecordings[partIdx];
                const statusText = document.getElementById("record-status");
                const timerDisplay = document.getElementById("record-timer");
                const playbackContainer = document.getElementById("playback-container");
                
                if (savedRec) {
                    statusText.textContent = "Đã dừng thu âm. Bạn có thể nghe lại bên dưới.";
                    statusText.style.color = "var(--text-primary)";
                    
                    const mins = String(Math.floor(savedRec.recordingSeconds / 60)).padStart(2, '0');
                    const secs = String(savedRec.recordingSeconds % 60).padStart(2, '0');
                    timerDisplay.textContent = `${mins}:${secs}`;
                    
                    playbackContainer.innerHTML = `
                        <div class="playback-card" style="width: 100%;">
                            <div class="playback-header">
                                <h5>Bài thu âm của bạn (Part ${partIdx + 1}):</h5>
                                <button class="btn-download-recording" id="btn-download-audio">
                                    <i data-lucide="download" style="width:12px;height:12px;"></i> Tải về (.webm)
                                </button>
                            </div>
                            <audio controls src="${savedRec.audioUrl}"></audio>
                        </div>
                    `;
                    
                    document.getElementById("btn-download-audio").onclick = () => {
                        const a = document.createElement("a");
                        a.href = savedRec.audioUrl;
                        a.download = `Speaking_Exam_${state.currentExamId}_Part_${partIdx + 1}.webm`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    };
                } else {
                    statusText.textContent = "Sẵn sàng thu âm";
                    statusText.style.color = "var(--text-primary)";
                    timerDisplay.textContent = "00:00";
                    playbackContainer.innerHTML = "";
                }
                
                lucide.createIcons();
            };
            
            // Set up click listeners for speaking part tabs
            setTimeout(() => {
                document.querySelectorAll(".speaking-part-tab-btn").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const idx = parseInt(btn.getAttribute("data-part-idx"));
                        switchSpeakingPart(idx);
                    });
                });
            }, 0);
            
            // Audio recording event hookup
            document.getElementById("btn-start-record").onclick = startSpeakingRecording;
            document.getElementById("btn-stop-record").onclick = stopSpeakingRecording;
            
            // Load Part 1 initially
            switchSpeakingPart(0);
            addWorkspaceTabs("speaking");
        }
        
        function addWorkspaceTabs(category) {
            let leftLabel = "Nội dung";
            let rightLabel = "Bài làm";
            let leftIcon = "file-text";
            let rightIcon = "check-circle-2";
            
            if (category === "reading") {
                leftLabel = "Bài Đọc";
                leftIcon = "book-open";
                rightLabel = "Câu Hỏi";
            } else if (category === "listening") {
                leftLabel = "Nghe Audio";
                leftIcon = "headphones";
                rightLabel = "Câu Hỏi";
            } else if (category === "writing") {
                leftLabel = "Đề Bài";
                leftIcon = "file-text";
                rightLabel = "Bài Viết";
                rightIcon = "pen-tool";
            } else if (category === "speaking") {
                leftLabel = "Đề Bài";
                leftIcon = "file-text";
                rightLabel = "Ghi Âm";
                rightIcon = "mic";
            }
            
            const tabsContainer = document.createElement("div");
            tabsContainer.className = "workspace-tabs";
            tabsContainer.innerHTML = `
                <button class="workspace-tab-btn active" id="w-tab-left">
                    <i data-lucide="${leftIcon}"></i> ${leftLabel}
                </button>
                <button class="workspace-tab-btn" id="w-tab-right">
                    <i data-lucide="${rightIcon}"></i> ${rightLabel}
                </button>
            `;
            
            elements.examWorkspace.prepend(tabsContainer);
            
            elements.examWorkspace.classList.add("show-left");
            elements.examWorkspace.classList.remove("show-right");
            
            tabsContainer.querySelector("#w-tab-left").onclick = () => {
                tabsContainer.querySelector("#w-tab-left").classList.add("active");
                tabsContainer.querySelector("#w-tab-right").classList.remove("active");
                elements.examWorkspace.classList.add("show-left");
                elements.examWorkspace.classList.remove("show-right");
            };
            
            tabsContainer.querySelector("#w-tab-right").onclick = () => {
                tabsContainer.querySelector("#w-tab-right").classList.add("active");
                tabsContainer.querySelector("#w-tab-left").classList.remove("active");
                elements.examWorkspace.classList.add("show-right");
                elements.examWorkspace.classList.remove("show-left");
            };
        }
        
        lucide.createIcons();
    }

    // Helper functions for B2 Writing Model Practice
    function extractSampleWriting(questionText) {
        if (!questionText) return "";
        const marker = /✍\s*Bài viết của bạn\s*:\s*/i;
        const match = questionText.match(marker);
        if (!match) return "";
        
        const textAfterMarker = questionText.substring(match.index + match[0].length);
        const stopMarkers = [
            "🎫", "🧾", "⚠️", "💳", "🚀", "📜",
            "Bạn còn", "Cần", "lượt chấm"
        ];
        
        const lines = textAfterMarker.split("\n");
        const sampleParagraphLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            let shouldStop = false;
            for (const sm of stopMarkers) {
                if (trimmed.includes(sm)) {
                    shouldStop = true;
                    break;
                }
            }
            if (shouldStop) break;
            sampleParagraphLines.push(line);
        }
        return sampleParagraphLines.join("\n").trim();
    }

    function getFirstLetterHint(sentence) {
        if (!sentence) return "";
        return sentence.split(/\s+/).map(word => {
            if (word.length <= 1) return word;
            const match = word.match(/^([a-zA-Z0-9])(.*?)(\W*)$/);
            if (match) {
                const firstChar = match[1];
                const middle = match[2];
                const ending = match[3];
                return firstChar + "_".repeat(middle.length) + ending;
            }
            return word;
        }).join(" ");
    }

    function getScrambledWords(sentence) {
        if (!sentence) return [];
        const clean = sentence.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
        const words = clean.split(/\s+/).map(w => w.trim()).filter(w => w.length > 0);
        
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }
        return words;
    }

    function getSimilarityScore(s1, s2) {
        s1 = s1.trim().toLowerCase().replace(/\s+/g, " ");
        s2 = s2.trim().toLowerCase().replace(/\s+/g, " ");
        
        if (s1 === s2) return 1.0;
        if (s1.length === 0 || s2.length === 0) return 0.0;
        
        const m = s1.length;
        const n = s2.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j - 1] + 1
                    );
                }
            }
        }
        
        const distance = dp[m][n];
        return 1.0 - distance / Math.max(m, n);
    }

    // Levenshtein similarity wrapper for sentence recall validation
    function calculateSimilarity(s1, s2) {
        return getSimilarityScore(s1, s2);
    }

    function diffWords(expected, actual) {
        const cleanWords = (text) => text.trim().split(/\s+/).filter(w => w.length > 0);
        const expWords = cleanWords(expected);
        const actWords = cleanWords(actual);
        
        const m = expWords.length;
        const n = actWords.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const w1 = expWords[i - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
                const w2 = actWords[j - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
                if (w1 === w2) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        let i = m;
        let j = n;
        const result = [];
        
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0) {
                const w1 = expWords[i - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
                const w2 = actWords[j - 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
                if (w1 === w2) {
                    result.unshift({ word: actWords[j - 1], type: 'correct' });
                    i--;
                    j--;
                } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                    result.unshift({ word: expWords[i - 1], type: 'missing' });
                    i--;
                } else {
                    result.unshift({ word: actWords[j - 1], type: 'inserted' });
                    j--;
                }
            } else if (i > 0) {
                result.unshift({ word: expWords[i - 1], type: 'missing' });
                i--;
            } else {
                result.unshift({ word: actWords[j - 1], type: 'inserted' });
                j--;
            }
        }
        return result;
    }

    // Paragraph text line break reformatter
    function formatParagraphs(text) {
        if (!text) return "";
        return text.split("\n")
            .map(para => para.trim())
            .filter(para => para !== "")
            .map(para => `<p>${para}</p>`)
            .join("");
    }

    // Clean inline newlines in scraped passages/translations
    function cleanNewlines(text) {
        if (!text) return "";
        text = text.replace(/\r/g, "");
        const lines = text.split("\n").map(line => line.trim()).filter(line => line !== "");
        if (lines.length === 0) return "";
        
        let mergedText = lines[0];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const prevLine = lines[i - 1];
            
            const endsWithPunc = /[.!?:"”')]$/.test(prevLine);
            const startsWithLower = /^[a-z,]/.test(line);
            const isHeadingOrMarker = /^(\([A-Z0-9]\)|Part \d+|Question \d+|Passage \d+|Blood Type|Tính cách)/i.test(line);
            
            let shouldMerge = false;
            if (!endsWithPunc && !isHeadingOrMarker) {
                shouldMerge = true;
            } else if (startsWithLower) {
                shouldMerge = true;
            }
            
            if (shouldMerge) {
                mergedText += " " + line;
            } else {
                mergedText += "\n" + line;
            }
        }
        return mergedText;
    }

    // Clean scraped portal junk from question prompt texts
    function cleanQuestionText(questionText) {
        if (!questionText) return "";
        
        const stopMarkers = [
            "✍", "🎤", "Trình duyệt của bạn", "🎫", "🧾", "⚠️", "💳", "🚀", "📜",
            "Bài viết của bạn", "Bài thu âm của bạn", "Bạn còn", "Cần", "lượt chấm"
        ];
        
        const lines = questionText.split("\n");
        const cleanLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            let shouldStop = false;
            for (const sm of stopMarkers) {
                if (trimmed.includes(sm)) {
                    shouldStop = true;
                    break;
                }
            }
            if (shouldStop) break;
            cleanLines.push(line);
        }
        return cleanLines.join("\n").trim();
    }

    // Split paragraphs or text block into sentences, ignoring common abbreviations
    function splitSentences(text) {
        if (!text) return [];
        const rawSplits = text.split(/(?<=[.!?])\s+/);
        const sentences = [];
        const abbreviations = /^(Mr|Mrs|Ms|Dr|Prof|St|Co|Corp|Inc|Ltd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|vs|eg|ie|U\.S|U\.K|A\.M|P\.M|a\.m|p\.m|vol|approx|dept)$/i;
        
        let currentSentence = "";
        for (let i = 0; i < rawSplits.length; i++) {
            const chunk = rawSplits[i];
            if (currentSentence === "") {
                currentSentence = chunk;
            } else {
                currentSentence += " " + chunk;
            }
            
            const match = currentSentence.match(/(\b\w+)\.[.!?]?$/);
            if (match) {
                const word = match[1];
                if (abbreviations.test(word)) {
                    continue;
                }
            }
            
            sentences.push(currentSentence.trim());
            currentSentence = "";
        }
        if (currentSentence !== "") {
            sentences.push(currentSentence.trim());
        }
        return sentences;
    }

    // Reconstruct paragraph-by-paragraph with sentence spans for hover translation
    function preparePassageHTML(englishText, vietnameseText) {
        if (!englishText) return "";
        const cleanEng = cleanNewlines(englishText);
        const cleanVie = cleanNewlines(vietnameseText || "");
        
        const rawEngParas = cleanEng.replace(/^Bài đọc\s*/i, "").split("\n").map(p => p.trim()).filter(p => p !== "");
        const rawVieParas = cleanVie.replace(/^(Bài dịch|Bản dịch)\s*/i, "").split("\n").map(p => p.trim()).filter(p => p !== "");
        
        const allVieSentences = [];
        rawVieParas.forEach(para => {
            allVieSentences.push(...splitSentences(para));
        });
        
        state.currentTranslationSentences = allVieSentences;
        let globalSentenceIdx = 0;
        let htmlResult = "";
        
        rawEngParas.forEach(paraText => {
            const sentences = splitSentences(paraText);
            const spanWrapped = sentences.map(sentence => {
                const idx = globalSentenceIdx++;
                return `<span class="trans-sentence" data-sentence-idx="${idx}">${sentence}</span>`;
            }).join(" ");
            
            htmlResult += `<p>${spanWrapped}</p>`;
        });
        
        return htmlResult;
    }

    // Render list of questions
    function renderQuestions(questions, startIndex = 0) {
        if (!questions || questions.length === 0) return "<p>Không có câu hỏi nào.</p>";
        
        return questions.map((q, localIndex) => {
            const qIndex = startIndex + localIndex;
            const choicesHtml = q.options.map((opt, oIndex) => {
                const optionLetter = String.fromCharCode(65 + oIndex); // A, B, C, D
                return `
                    <div class="choice-option" data-qindex="${qIndex}" data-oindex="${oIndex}" id="choice-q${qIndex}-${oIndex}">
                        <input type="radio" name="q-${qIndex}" value="${oIndex}" id="input-q${qIndex}-${oIndex}">
                        <div class="choice-indicator">${optionLetter}</div>
                        <div class="choice-content-wrapper">
                            <div class="choice-text">${opt}</div>
                            <div class="choice-explanation" id="choice-explanation-q${qIndex}-${oIndex}" style="display: none;"></div>
                        </div>
                    </div>
                `;
            }).join("");
            
            return `
                <div class="question-block" id="block-q-${qIndex}">
                    <div class="q-text">${q.question}</div>
                    <div class="choices-list">
                        ${choicesHtml}
                    </div>
                    <div class="explanation-container" id="explanation-q-${qIndex}" style="display: none;">
                        <!-- Injected after submit -->
                    </div>
                </div>
            `;
        }).join("");
    }

    // Render pagination progress dots
    function renderProgressDots(questions) {
        if (!questions) return "";
        return questions.map((q, idx) => {
            return `
                <div class="progress-dot" data-qindex="${idx}" id="dot-q-${idx}">
                    ${idx + 1}
                </div>
            `;
        }).join("");
    }

    // Hook up answer selection events
    function setupAnswerListeners() {
        document.querySelectorAll(".choice-option").forEach(option => {
            option.addEventListener("click", () => {
                if (state.isSubmitted) return; // Prevent selection changes post-submit
                
                const qIndex = parseInt(option.getAttribute("data-qindex"));
                const oIndex = parseInt(option.getAttribute("data-oindex"));
                
                // Remove previous selected selection in the same question
                document.querySelectorAll(`.choice-option[data-qindex="${qIndex}"]`).forEach(el => {
                    el.classList.remove("selected");
                });
                
                // Select new one
                option.classList.add("selected");
                const radio = option.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
                
                // Update state
                state.userAnswers[qIndex] = oIndex;
                
                // Mark dot as answered
                const dot = document.getElementById(`dot-q-${qIndex}`);
                if (dot) dot.classList.add("answered");
            });
        });
        
        // Progress dots navigation scrolling click behavior
        document.querySelectorAll(".progress-dot").forEach(dot => {
            dot.addEventListener("click", () => {
                const qIndex = parseInt(dot.getAttribute("data-qindex"));
                
                // Auto switch parts for Reading
                if (state.currentCategory === "reading") {
                    let targetPart = 0;
                    if (qIndex >= 30) targetPart = 3;
                    else if (qIndex >= 20) targetPart = 2;
                    else if (qIndex >= 10) targetPart = 1;
                    
                    if (state.currentReadingPartIdx !== targetPart) {
                        state.switchReadingPart(targetPart);
                    }
                }
                
                // Auto switch parts for Listening
                if (state.currentCategory === "listening") {
                    let targetPart = 0;
                    if (qIndex >= 20) targetPart = 2;
                    else if (qIndex >= 8) targetPart = 1;
                    
                    if (state.currentListeningPartIdx !== targetPart) {
                        state.switchListeningPart(targetPart);
                    }
                }
                
                const block = document.getElementById(`block-q-${qIndex}`);
                if (block) {
                    // Remove active from other dots
                    document.querySelectorAll(".progress-dot").forEach(el => el.classList.remove("active"));
                    dot.classList.add("active");
                    
                    block.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });
        });
    }

    // 8. Quiz Submission Logic
    function submitQuiz() {
        if (state.isSubmitted) return;
        
        const questions = state.currentExamData.questions || [];
        
        // Warning confirmation check if not all questions were answered
        const answeredCount = Object.keys(state.userAnswers).length;
        if (answeredCount < questions.length) {
            const confirmSubmit = confirm(`Bạn mới trả lời được ${answeredCount}/${questions.length} câu hỏi. Bạn có chắc chắn muốn nộp bài?`);
            if (!confirmSubmit) return;
        }
        
        state.isSubmitted = true;
        
        // Lock submit button
        const submitBtn = document.getElementById("submit-quiz-btn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="check"></i> Đã Nộp Bài`;
        }
        
        let score = 0;
        
        questions.forEach((q, qIndex) => {
            const userSelectionIndex = state.userAnswers[qIndex];
            
            // Clean correct answer string from JSON (e.g. "D. species" -> find index D -> 3)
            const correctAnswerText = q.correct_answer;
            let correctOptionIndex = -1;
            
            if (correctAnswerText) {
                // Usually answers are prefixed like "A. ...", "B. ...", "C. ...", "D. ..."
                const match = correctAnswerText.trim().match(/^([A-D])\./i);
                if (match) {
                    correctOptionIndex = match[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                } else {
                    // Try exact match or match options
                    correctOptionIndex = q.options.findIndex(opt => opt.trim() === correctAnswerText.trim());
                }
            }
            
            const isCorrect = userSelectionIndex === correctOptionIndex;
            if (isCorrect) score++;
            
            // Mark option cards styling
            q.options.forEach((opt, oIndex) => {
                const optionCard = document.getElementById(`choice-q${qIndex}-${oIndex}`);
                if (!optionCard) return;
                
                if (oIndex === correctOptionIndex) {
                    optionCard.classList.add("correct");
                } else if (oIndex === userSelectionIndex) {
                    optionCard.classList.add("incorrect");
                }
            });
            
            // Mark progress dot
            const dot = document.getElementById(`dot-q-${qIndex}`);
            if (dot) {
                dot.classList.remove("answered");
                dot.classList.add(isCorrect ? "correct" : "incorrect");
            }
            
            // Display explanation card
            const expContainer = document.getElementById(`explanation-q-${qIndex}`);
            if (expContainer && q.explanation) {
                // Nested helper function for cleaning string
                const cleanText = (str) => {
                    if (!str) return "";
                    // Remove A. B. C. D. prefixes
                    let s = str.trim().replace(/^[A-Z](?:\.|\)|\/)?\s+/i, "");
                    // Remove translations/parentheses
                    s = s.replace(/\([^)]*\)/g, "");
                    // Keep only alphanumeric and lowercase
                    return s.replace(/[\W_]+/g, "").toLowerCase();
                };

                // Helper to extract option details
                const extractOptionExplanation = (symbol, blockText, isListeningStyle) => {
                    let rawText = blockText || "";
                    if (isListeningStyle) {
                        const lines = rawText.split('\n');
                        if (lines.length > 1) {
                            const lastLine = lines[lines.length - 1].trim();
                            if (lastLine.length > 0 && lastLine.length < 100) {
                                lines.pop();
                                rawText = lines.join('\n');
                            }
                        }
                    }

                    let translation = "";
                    let explanationText = "";

                    const parenthesizedMatch = rawText.match(/\(([^)]+)\)/);
                    if (parenthesizedMatch) {
                        translation = parenthesizedMatch[1].trim();
                    }

                    const separators = [/→/, /->/, /–/, / - /];
                    let splitIndex = -1;
                    let sepUsed = null;
                    for (let sep of separators) {
                        const match = rawText.match(sep);
                        if (match) {
                            splitIndex = match.index;
                            sepUsed = match[0];
                            break;
                        }
                    }

                    if (splitIndex !== -1) {
                        explanationText = rawText.substring(splitIndex + sepUsed.length).trim();
                    } else {
                        explanationText = rawText.replace(/\([^)]+\)/g, "").trim();
                        explanationText = explanationText.replace(/^[✅❌\s\-\–\→]+/, "").trim();
                    }

                    explanationText = explanationText.replace(/^[✅❌\s\-\–\→\:\.\,]+/, "").trim();

                    return {
                        symbol: symbol,
                        translation: translation,
                        explanation: explanationText
                    };
                };

                const parts = q.explanation.split(/(✅|❌)/);
                const optionExplanations = {};
                let generalExplanation = parts[0] || "";

                if (parts.length > 1) {
                    q.options.forEach((opt, oIndex) => {
                        const cleanedOpt = cleanText(opt);
                        let bestMatchIdx = -1;

                        // First pass: exact match
                        for (let i = 1; i < parts.length; i += 2) {
                            const prevText = parts[i - 1] || "";
                            const nextText = parts[i + 1] || "";

                            const prevLines = prevText.trim().split('\n');
                            const tailLine = prevLines[prevLines.length - 1] || "";

                            const nextLines = nextText.trim().split('\n');
                            const headLine = nextLines[0] || "";
                            const headLine2 = nextLines[1] || "";

                            const cleanTail = cleanText(tailLine);
                            const cleanHead = cleanText(headLine);
                            const cleanHead2 = cleanText(headLine2);

                            if (cleanTail === cleanedOpt || cleanHead === cleanedOpt || cleanHead2 === cleanedOpt) {
                                bestMatchIdx = i;
                                break;
                            }
                        }

                        // Second pass: substring match
                        if (bestMatchIdx === -1 && cleanedOpt.length > 3) {
                            for (let i = 1; i < parts.length; i += 2) {
                                const prevText = parts[i - 1] || "";
                                const nextText = parts[i + 1] || "";

                                const prevLines = prevText.trim().split('\n');
                                const tailLine = prevLines[prevLines.length - 1] || "";

                                const nextLines = nextText.trim().split('\n');
                                const headLine = nextLines[0] || "";
                                const headLine2 = nextLines[1] || "";

                                const cleanTail = cleanText(tailLine);
                                const cleanHead = cleanText(headLine);
                                const cleanHead2 = cleanText(headLine2);

                                if (
                                    (cleanTail.length > 0 && (cleanTail.includes(cleanedOpt) || cleanedOpt.includes(cleanTail))) ||
                                    (cleanHead.length > 0 && (cleanHead.includes(cleanedOpt) || cleanedOpt.includes(cleanHead))) ||
                                    (cleanHead2.length > 0 && (cleanHead2.includes(cleanedOpt) || cleanedOpt.includes(cleanHead2)))
                                ) {
                                    bestMatchIdx = i;
                                    break;
                                }
                            }
                        }

                        if (bestMatchIdx !== -1) {
                            const symbol = parts[bestMatchIdx];
                            const blockText = parts[bestMatchIdx + 1];

                            const prevLines = (parts[bestMatchIdx - 1] || "").trim().split('\n');
                            const tailLine = prevLines[prevLines.length - 1] || "";
                            const cleanTail = cleanText(tailLine);
                            const isListeningStyle = cleanTail.length > 0 && (cleanTail.includes(cleanedOpt) || cleanedOpt.includes(cleanTail));

                            optionExplanations[oIndex] = extractOptionExplanation(symbol, blockText, isListeningStyle);
                        }
                    });
                }

                // If we successfully mapped some explanations, distribute them and update main block to show only general context
                const mappedKeys = Object.keys(optionExplanations);
                if (mappedKeys.length > 0) {
                    q.options.forEach((opt, oIndex) => {
                        const optExp = optionExplanations[oIndex];
                        const choiceExpContainer = document.getElementById(`choice-explanation-q${qIndex}-${oIndex}`);
                        if (choiceExpContainer) {
                            if (optExp) {
                                const statusClass = optExp.symbol === "✅" ? "correct" : "incorrect";
                                const statusText = optExp.symbol === "✅" ? "✅ Đúng:" : "❌ Sai:";
                                
                                let translationHtml = "";
                                if (optExp.translation) {
                                    translationHtml = `
                                        <div class="choice-translation">
                                            <span class="lbl-translation">Dịch nghĩa:</span> ${optExp.translation}
                                        </div>
                                    `;
                                }

                                choiceExpContainer.innerHTML = `
                                    ${translationHtml}
                                    <div class="choice-exp-detail">
                                        <span class="lbl-status ${statusClass}">${statusText}</span>
                                        <span>${optExp.explanation}</span>
                                    </div>
                                `;
                                choiceExpContainer.style.display = "block";
                            } else {
                                choiceExpContainer.style.display = "none";
                            }
                        }
                    });

                    // Update main explanation container with only the general transcript/context
                    let cleanGeneral = generalExplanation.trim();
                    cleanGeneral = cleanGeneral.replace(/Phân tích các lựa chọn:\s*$/i, "").trim();
                    cleanGeneral = cleanGeneral.replace(/Phân tích lựa chọn:\s*$/i, "").trim();
                    cleanGeneral = cleanGeneral.replace(/Chi tiết các đáp án:\s*$/i, "").trim();
                    
                    if (cleanGeneral.length > 0) {
                        expContainer.style.display = "block";
                        expContainer.innerHTML = `
                            <div class="explanation-header">
                                <i data-lucide="help-circle"></i> <span>Thông tin câu hỏi và Dịch nghĩa:</span>
                            </div>
                            <div class="explanation-content">
                                ${cleanGeneral}
                            </div>
                        `;
                    } else {
                        expContainer.style.display = "none";
                    }
                } else {
                    // Fallback: render full explanation in case parsing failed or no checkboxes present
                    expContainer.style.display = "block";
                    expContainer.innerHTML = `
                        <div class="explanation-header">
                            <i data-lucide="help-circle"></i> <span>Đáp án và Giải thích chi tiết:</span>
                        </div>
                        <div class="explanation-content">
                            ${q.explanation}
                        </div>
                    `;
                }
            }
        });
        
        // Show Score banner card at the top of questions panel
        const questionsPanel = document.getElementById("questions-panel");
        const banner = document.createElement("div");
        banner.className = "score-banner-card";
        banner.innerHTML = `
            <div class="score-info">
                <h4>Kết Quả Luyện Tập</h4>
                <p>Bạn đã hoàn thành bài thi với tỉ lệ chính xác.</p>
            </div>
            <div class="score-circle">
                <span class="score-num">${score}/${questions.length}</span>
                <span class="score-lbl">ĐIỂM SỐ</span>
            </div>
        `;
        
        // Insert score banner before the questions container
        const questionsContainer = document.getElementById("questions-container");
        questionsPanel.insertBefore(banner, questionsContainer);
        
        // Scroll to score banner
        banner.scrollIntoView({ behavior: "smooth", block: "center" });
        
        lucide.createIcons();
    }

    // 9. Side panel offcanvas translations togglers
    function showTranslation(content, title = "Bản dịch tiếng Việt") {
        if (!content) {
            elements.offcanvasBody.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding: 2rem;">Đề thi này không chứa nội dung tương ứng.</p>`;
        } else {
            elements.offcanvasBody.innerHTML = formatParagraphs(content);
        }
        elements.offcanvasTitle.textContent = title;
        elements.offcanvas.classList.add("active");
    }

    elements.offcanvasClose.addEventListener("click", () => {
        elements.offcanvas.classList.remove("active");
    });

    // Close offcanvas when click outside content
    window.addEventListener("click", (e) => {
        if (e.target === elements.offcanvas) {
            elements.offcanvas.classList.remove("active");
        }
    });

    // 10. Speaking Voice Recorder (MediaRecorder API)
    async function startSpeakingRecording() {
        state.audioChunks = [];
        const btnStart = document.getElementById("btn-start-record");
        const btnStop = document.getElementById("btn-stop-record");
        const statusText = document.getElementById("record-status");
        const timerDisplay = document.getElementById("record-timer");
        const micVisualizer = document.getElementById("mic-visualizer");
        const playbackContainer = document.getElementById("playback-container");
        
        playbackContainer.innerHTML = ""; // Clear old audio player
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            state.mediaRecorder = new MediaRecorder(stream);
            
            state.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    state.audioChunks.push(event.data);
                }
            };
            
            state.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                const partIdx = state.currentSpeakingPartIdx || 0;
                state.speakingRecordings[partIdx] = {
                    audioBlob: audioBlob,
                    audioUrl: audioUrl,
                    recordingSeconds: state.recordingSeconds
                };
                
                // Render playback panel
                playbackContainer.innerHTML = `
                    <div class="playback-card" style="width: 100%;">
                        <div class="playback-header">
                            <h5>Bài thu âm của bạn (Part ${partIdx + 1}):</h5>
                            <button class="btn-download-recording" id="btn-download-audio">
                                <i data-lucide="download" style="width:12px;height:12px;"></i> Tải về (.webm)
                            </button>
                        </div>
                        <audio controls src="${audioUrl}"></audio>
                    </div>
                `;
                
                // Add download handler
                document.getElementById("btn-download-audio").onclick = () => {
                    const a = document.createElement("a");
                    a.href = audioUrl;
                    a.download = `Speaking_Exam_${state.currentExamId}_Part_${partIdx + 1}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
                
                lucide.createIcons();
                
                // Stop all tracks on the stream to release mic icon/resource
                stream.getTracks().forEach(track => track.stop());
            };
            
            // Start recording
            state.mediaRecorder.start();
            
            // Update UI state
            btnStart.style.display = "none";
            btnStop.style.display = "flex";
            statusText.textContent = "Đang thu âm...";
            statusText.style.color = "var(--color-danger)";
            micVisualizer.classList.add("recording");
            
            // Start Timer clock
            state.recordingSeconds = 0;
            timerDisplay.textContent = "00:00";
            state.recordingTimer = setInterval(() => {
                state.recordingSeconds++;
                const mins = String(Math.floor(state.recordingSeconds / 60)).padStart(2, '0');
                const secs = String(state.recordingSeconds % 60).padStart(2, '0');
                timerDisplay.textContent = `${mins}:${secs}`;
            }, 1000);
            
        } catch (err) {
            console.error("Microphone access denied or error:", err);
            alert("Lỗi truy cập Microphone! Vui lòng cấp quyền truy cập mic cho trình duyệt để thực hiện phần thi nói.");
        }
    }

    function stopSpeakingRecording() {
        const btnStart = document.getElementById("btn-start-record");
        const btnStop = document.getElementById("btn-stop-record");
        const statusText = document.getElementById("record-status");
        const micVisualizer = document.getElementById("mic-visualizer");
        
        if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
            state.mediaRecorder.stop();
        }
        
        // Clear Timer clock
        if (state.recordingTimer) {
            clearInterval(state.recordingTimer);
            state.recordingTimer = null;
        }
        
        // Reset UI elements
        if (btnStart) btnStart.style.display = "flex";
        if (btnStop) btnStop.style.display = "none";
        if (statusText) {
            statusText.textContent = "Đã dừng thu âm. Bạn có thể nghe lại bên dưới.";
            statusText.style.color = "var(--text-primary)";
        }
        if (micVisualizer) micVisualizer.classList.remove("recording");
    }

    // Helper safety stopper when switching pages or routing away
    function stopSpeakingRecordingState() {
        if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
            state.mediaRecorder.stop();
        }
        if (state.recordingTimer) {
            clearInterval(state.recordingTimer);
            state.recordingTimer = null;
        }
    }
});
