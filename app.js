/**
 * JSON Editor & Viewer Application
 * Lightweight, fast JSON editing and viewing tool
 */
(function() {
    'use strict';

    // DOM Elements
    const elements = {
        tabs: document.querySelectorAll('.tab'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        editor: document.getElementById('json-editor'),
        editorScroll: document.getElementById('editor-scroll'),
        syntaxHighlight: document.getElementById('syntax-highlight'),
        lineNumbers: document.getElementById('line-numbers'),
        statusBadge: document.getElementById('status-badge'),
        formatBtn: document.getElementById('format-btn'),
        minifyBtn: document.getElementById('minify-btn'),
        copyBtn: document.getElementById('copy-btn'),
        clearBtn: document.getElementById('clear-btn'),
        treeContent: document.getElementById('tree-content'),
        detailsContent: document.getElementById('details-content'),
        expandAllBtn: document.getElementById('expand-all'),
        collapseAllBtn: document.getElementById('collapse-all'),
        schemaEditor: document.getElementById('schema-editor'),
        schemaEditorScroll: document.getElementById('schema-editor-scroll'),
        schemaSyntaxHighlight: document.getElementById('schema-syntax-highlight'),
        schemaLineNumbers: document.getElementById('schema-line-numbers'),
        schemaInfoContent: document.getElementById('schema-info-content'),
        validationContent: document.getElementById('validation-content'),
        generateSchemaBtn: document.getElementById('generate-schema-btn'),
        uploadSchemaInput: document.getElementById('upload-schema'),
        validateBtn: document.getElementById('validate-btn'),
        copySchemaBtn: document.getElementById('copy-schema-btn'),
        downloadSchemaBtn: document.getElementById('download-schema-btn'),
        downloadJsonBtn: document.getElementById('download-json-btn'),
        uploadJsonInput: document.getElementById('upload-json'),
        bsonContent: document.getElementById('bson-content'),
        bsonInfoContent: document.getElementById('bson-info-content'),
        copyBsonBtn: document.getElementById('copy-bson'),
        downloadBsonBtn: document.getElementById('download-bson'),
        uploadBsonInput: document.getElementById('upload-bson'),
        msgpackContent: document.getElementById('msgpack-content'),
        msgpackInfoContent: document.getElementById('msgpack-info-content'),
        copyMsgpackBtn: document.getElementById('copy-msgpack'),
        downloadMsgpackBtn: document.getElementById('download-msgpack'),
        uploadMsgpackInput: document.getElementById('upload-msgpack'),
        cborContent: document.getElementById('cbor-content'),
        cborInfoContent: document.getElementById('cbor-info-content'),
        copyCborBtn: document.getElementById('copy-cbor'),
        downloadCborBtn: document.getElementById('download-cbor'),
        uploadCborInput: document.getElementById('upload-cbor'),
        toast: document.getElementById('toast'),
        bookmarkBtn: document.getElementById('bookmark-btn'),
        aboutBtn: document.getElementById('about-btn'),
        aboutModal: document.getElementById('about-modal'),
        aboutClose: document.getElementById('about-close'),
        themeToggle: document.getElementById('theme-toggle'),
        themeIcon: document.getElementById('theme-icon')
    };

    // State
    let currentJson = null;
    let jsonError = null;
    let errorLine = null;
    let selectedNode = null;
    let debounceTimer = null;
    let saveTimer = null;
    
    // LocalStorage keys
    const STORAGE_KEY = 'json-viewer-content';
    const THEME_KEY = 'json-viewer-theme';

    // ============ Tab Navigation ============
    function initTabs() {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                switchTab(tabId);
            });
        });
    }

    function switchTab(tabId) {
        elements.tabs.forEach(t => t.classList.remove('active'));
        elements.tabPanels.forEach(p => p.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');

        if (tabId === 'viewer') {
            if (jsonError) {
                showViewerError(jsonError);
            } else if (currentJson !== null) {
                renderTree(currentJson);
            } else {
                showViewerEmpty();
            }
        }
        
        if (tabId === 'schema') {
            if (jsonError) {
                showSchemaError(jsonError);
            } else if (currentJson !== null) {
                renderSchema(currentJson);
            } else {
                showSchemaEmpty();
            }
        }
        
        if (tabId === 'bson') {
            if (jsonError) {
                showBsonError(jsonError);
            } else if (currentJson !== null) {
                renderBson(currentJson);
            } else {
                showBsonEmpty();
            }
        }
        
        if (tabId === 'msgpack') {
            if (jsonError) {
                showMsgpackError(jsonError);
            } else if (currentJson !== null) {
                renderMsgpack(currentJson);
            } else {
                showMsgpackEmpty();
            }
        }
        
        if (tabId === 'cbor') {
            if (jsonError) {
                showCborError(jsonError);
            } else if (currentJson !== null) {
                renderCbor(currentJson);
            } else {
                showCborEmpty();
            }
        }
    }
    
    function showViewerError(error) {
        elements.treeContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
        resetDetails();
    }
    
    function showViewerEmpty() {
        elements.treeContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to view structure</p>
            </div>`;
        resetDetails();
    }
    
    function showSchemaError(error) {
        elements.schemaEditor.placeholder = `Invalid JSON: ${error}\n\nFix JSON errors to generate schema, or paste your own schema here.`;
        elements.schemaInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate schema</p>
            </div>`;
        elements.validationContent.innerHTML = `
            <div class="validation-result invalid">
                <span class="material-icons">error</span>
                <span>Invalid JSON in editor</span>
            </div>`;
        currentSchema = null;
    }
    
    function showSchemaEmpty() {
        elements.schemaEditor.placeholder = 'Generate schema from JSON or paste your own...';
        elements.schemaInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Schema statistics will appear here</p>
            </div>`;
        elements.validationContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">pending</span>
                <p>Click Validate to check JSON against schema</p>
            </div>`;
        currentSchema = null;
    }

    // ============ JSON Editor ============
    function initEditor() {
        elements.editor.addEventListener('input', handleEditorInput);
        elements.editor.addEventListener('keydown', handleKeyDown);
        elements.editor.addEventListener('click', scrollToCaret);
        elements.editor.addEventListener('keyup', scrollToCaret);
        elements.editorScroll.addEventListener('scroll', syncLineNumbers, { passive: true });
        
        // Click anywhere in scroll area focuses editor
        elements.editorScroll.addEventListener('click', () => elements.editor.focus());
        
        elements.formatBtn.addEventListener('click', formatJson);
        elements.minifyBtn.addEventListener('click', minifyJson);
        elements.copyBtn.addEventListener('click', copyToClipboard);
        elements.clearBtn.addEventListener('click', clearEditor);
        elements.downloadJsonBtn.addEventListener('click', downloadJson);
        elements.uploadJsonInput.addEventListener('change', uploadJson);

        // Initial state
        updateLineNumbers();
        updateSyntaxHighlight();
    }

    function handleEditorInput() {
        // Instant visual updates
        updateLineNumbers();
        updateSyntaxHighlight();
        
        // Ensure caret is visible
        scrollToCaret();
        
        // Debounce only JSON validation
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(validateJson, 250);
        
        // Debounce localStorage save (1 sec)
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveToStorage, 1000);
    }
    
    function saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, elements.editor.value);
        } catch (e) {
            // Silently fail if localStorage is not available or full
            console.warn('Failed to save to localStorage:', e);
        }
    }
    
    function loadFromStorage() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
            return null;
        }
    }
    
    function clearStorage() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // Silently fail
        }
    }
    
    function scrollToCaret() {
        const editor = elements.editor;
        const scroll = elements.editorScroll;
        
        // Get caret position
        const pos = editor.selectionStart;
        const textBeforeCaret = editor.value.substring(0, pos);
        const lines = textBeforeCaret.split('\n');
        const lineNum = lines.length;
        const colNum = lines[lines.length - 1].length;
        
        // Calculate approximate pixel positions
        const lineHeight = 12 * 1.5; // font-size * line-height
        const charWidth = 7.2; // approximate char width for monospace 12px
        const padding = 8;
        
        const caretTop = (lineNum - 1) * lineHeight + padding;
        const caretLeft = colNum * charWidth + padding;
        
        // Scroll if caret is out of view
        const viewTop = scroll.scrollTop;
        const viewBottom = viewTop + scroll.clientHeight;
        const viewLeft = scroll.scrollLeft;
        const viewRight = viewLeft + scroll.clientWidth;
        
        if (caretTop < viewTop + padding) {
            scroll.scrollTop = caretTop - padding;
        } else if (caretTop + lineHeight > viewBottom - padding) {
            scroll.scrollTop = caretTop + lineHeight - scroll.clientHeight + padding;
        }
        
        if (caretLeft < viewLeft + padding) {
            scroll.scrollLeft = caretLeft - padding;
        } else if (caretLeft > viewRight - padding * 2) {
            scroll.scrollLeft = caretLeft - scroll.clientWidth + padding * 2;
        }
    }

    function handleKeyDown(e) {
        // Tab key handling
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = elements.editor.selectionStart;
            const end = elements.editor.selectionEnd;
            const value = elements.editor.value;
            
            elements.editor.value = value.substring(0, start) + '  ' + value.substring(end);
            elements.editor.selectionStart = elements.editor.selectionEnd = start + 2;
            handleEditorInput();
        }
    }

    function syncLineNumbers() {
        elements.lineNumbers.scrollTop = elements.editorScroll.scrollTop;
    }

    function updateLineNumbers() {
        const lines = elements.editor.value.split('\n');
        const count = lines.length;
        let html = '';
        for (let i = 1; i <= count; i++) {
            if (errorLine === i) {
                html += `<span class="error">${i}</span>`;
            } else {
                html += `<span>${i}</span>`;
            }
        }
        elements.lineNumbers.innerHTML = html;
    }

    function updateSyntaxHighlight() {
        const code = elements.editor.value;
        // Skip highlighting for very large content (>2MB) for performance
        if (code.length > 2000000) {
            elements.syntaxHighlight.textContent = code + '\n';
            return;
        }
        
        let html = highlightSyntax(code);
        
        // Add error line highlighting if there's an error
        if (errorLine !== null) {
            const lines = html.split('\n');
            if (errorLine >= 1 && errorLine <= lines.length) {
                lines[errorLine - 1] = `<span class="error-line">${lines[errorLine - 1]}</span>`;
                html = lines.join('\n');
            }
        }
        
        elements.syntaxHighlight.innerHTML = html + '\n';
    }

    function highlightSyntax(code) {
        // Escape HTML
        let escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Tokenize and highlight
        // Strings
        escaped = escaped.replace(/"([^"\\]|\\.)*"/g, match => {
            // Check if it's a key (followed by :)
            return `<span class="string">${match}</span>`;
        });

        // Numbers
        escaped = escaped.replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="number">$1</span>');

        // Boolean
        escaped = escaped.replace(/\b(true|false)\b/g, '<span class="boolean">$1</span>');

        // Null
        escaped = escaped.replace(/\bnull\b/g, '<span class="null">null</span>');

        // Brackets
        escaped = escaped.replace(/([{}\[\]])/g, '<span class="bracket">$1</span>');

        // Keys (strings before colons)
        escaped = escaped.replace(/<span class="string">("(?:[^"\\]|\\.)*")<\/span>\s*:/g, 
            '<span class="key">$1</span>:');

        return escaped;
    }

    function validateJson() {
        const value = elements.editor.value.trim();
        
        if (!value) {
            setStatus('empty');
            currentJson = null;
            jsonError = null;
            errorLine = null;
            updateLineNumbers();
            updateSyntaxHighlight();
            return;
        }

        try {
            currentJson = JSON.parse(value);
            jsonError = null;
            errorLine = null;
            setStatus('valid');
            updateLineNumbers();
            updateSyntaxHighlight();
        } catch (e) {
            currentJson = null;
            jsonError = e.message;
            errorLine = getErrorLine(e.message, elements.editor.value);
            setStatus('invalid', e.message);
            updateLineNumbers();
            updateSyntaxHighlight();
        }
    }

    function getErrorLine(errorMessage, code) {
        // Try to extract line number from different browser formats
        
        // Firefox: "at line X column Y"
        let match = errorMessage.match(/at line (\d+)/i);
        if (match) {
            return parseInt(match[1], 10);
        }
        
        // Chrome/V8: "at position X" - need to convert position to line
        match = errorMessage.match(/at position (\d+)/i);
        if (match) {
            const position = parseInt(match[1], 10);
            return positionToLine(code, position);
        }
        
        // Chrome/V8: "Unexpected token X in JSON at position Y"
        match = errorMessage.match(/position (\d+)/i);
        if (match) {
            const position = parseInt(match[1], 10);
            return positionToLine(code, position);
        }
        
        // Safari: might use different format, try line number
        match = errorMessage.match(/line (\d+)/i);
        if (match) {
            return parseInt(match[1], 10);
        }
        
        return null;
    }

    function positionToLine(code, position) {
        if (position < 0 || position > code.length) return null;
        const textBefore = code.substring(0, position);
        return textBefore.split('\n').length;
    }

    function setStatus(status, message = '') {
        const badge = elements.statusBadge;
        const icon = badge.querySelector('.material-icons');
        const text = badge.querySelector('.status-text');

        badge.classList.remove('error');

        switch (status) {
            case 'valid':
                icon.textContent = 'check_circle';
                text.textContent = 'Valid JSON';
                break;
            case 'invalid':
                badge.classList.add('error');
                icon.textContent = 'error';
                text.textContent = 'Invalid JSON';
                break;
            case 'empty':
                icon.textContent = 'remove_circle_outline';
                text.textContent = 'Empty';
                break;
        }
    }

    function formatJson() {
        if (!elements.editor.value.trim()) {
            showToast('Nothing to format', 'error');
            return;
        }

        try {
            const obj = JSON.parse(elements.editor.value);
            elements.editor.value = JSON.stringify(obj, null, 2);
            handleEditorInput();
            showToast('JSON formatted', 'success');
        } catch (e) {
            showToast('Invalid JSON: ' + e.message, 'error');
        }
    }

    function minifyJson() {
        if (!elements.editor.value.trim()) {
            showToast('Nothing to minify', 'error');
            return;
        }

        try {
            const obj = JSON.parse(elements.editor.value);
            elements.editor.value = JSON.stringify(obj);
            handleEditorInput();
            showToast('JSON minified', 'success');
        } catch (e) {
            showToast('Invalid JSON: ' + e.message, 'error');
        }
    }

    function copyToClipboard() {
        if (!elements.editor.value.trim()) {
            showToast('Nothing to copy', 'error');
            return;
        }

        navigator.clipboard.writeText(elements.editor.value).then(() => {
            showToast('Copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    function clearEditor() {
        elements.editor.value = '';
        handleEditorInput();
        currentJson = null;
        clearStorage();
        showToast('Editor cleared', 'success');
    }

    function downloadJson() {
        if (!elements.editor.value.trim()) {
            showToast('Nothing to download', 'error');
            return;
        }
        
        const blob = new Blob([elements.editor.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('JSON downloaded', 'success');
    }

    function uploadJson(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            elements.editor.value = content;
            handleEditorInput();
            showToast('JSON loaded from ' + file.name, 'success');
        };
        reader.onerror = function() {
            showToast('Failed to read file', 'error');
        };
        reader.readAsText(file);
        
        // Reset input
        event.target.value = '';
    }

    // ============ Tree Viewer ============
    function initTreeViewer() {
        elements.expandAllBtn.addEventListener('click', expandAll);
        elements.collapseAllBtn.addEventListener('click', collapseAll);
    }

    function renderTree(data) {
        if (data === null || data === undefined) {
            elements.treeContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">info_outline</span>
                    <p>Enter valid JSON in the editor to view structure</p>
                </div>`;
            return;
        }

        const tree = document.createElement('div');
        tree.className = 'tree-node';
        tree.appendChild(createTreeNode(data, 'root', '$'));
        
        elements.treeContent.innerHTML = '';
        elements.treeContent.appendChild(tree);
        
        // Reset details panel
        resetDetails();
    }

    function createTreeNode(data, key, path) {
        const fragment = document.createDocumentFragment();
        const type = getType(data);
        
        const item = document.createElement('div');
        item.className = 'tree-item';
        item.dataset.path = path;
        item.dataset.type = type;

        const isExpandable = type === 'object' || type === 'array';
        
        // Toggle icon
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle' + (isExpandable ? '' : ' hidden');
        toggle.innerHTML = '<span class="material-icons">expand_more</span>';
        item.appendChild(toggle);

        // Key
        if (key !== 'root') {
            const keySpan = document.createElement('span');
            keySpan.className = 'tree-key';
            keySpan.textContent = type === 'array' ? '' : `"${key}"`;
            if (type !== 'array' || key !== 'root') {
                keySpan.textContent = typeof key === 'number' ? `[${key}]` : `"${key}"`;
                keySpan.style.color = typeof key === 'number' ? 'var(--syntax-number)' : '';
            }
            item.appendChild(keySpan);
        }

        if (isExpandable) {
            const bracket = document.createElement('span');
            bracket.className = 'tree-bracket';
            bracket.textContent = type === 'array' ? '[' : '{';
            item.appendChild(bracket);

            const length = type === 'array' ? data.length : Object.keys(data).length;
            const preview = document.createElement('span');
            preview.className = 'tree-preview';
            preview.textContent = `${length} ${length === 1 ? 'item' : 'items'}`;
            item.appendChild(preview);

            fragment.appendChild(item);

            // Children container
            const children = document.createElement('div');
            children.className = 'tree-children';

            if (type === 'array') {
                data.forEach((val, idx) => {
                    children.appendChild(createTreeNode(val, idx, `${path}[${idx}]`));
                });
            } else {
                Object.keys(data).forEach(k => {
                    children.appendChild(createTreeNode(data[k], k, `${path}.${k}`));
                });
            }

            fragment.appendChild(children);

            // Closing bracket (same level as opening bracket)
            const closingItem = document.createElement('div');
            closingItem.className = 'tree-item';
            closingItem.style.paddingLeft = '24px';
            const closingBracket = document.createElement('span');
            closingBracket.className = 'tree-bracket';
            closingBracket.textContent = type === 'array' ? ']' : '}';
            closingItem.appendChild(closingBracket);
            fragment.appendChild(closingItem);

            // Toggle functionality
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle.classList.toggle('collapsed');
                children.classList.toggle('collapsed');
                closingItem.classList.toggle('collapsed');
            });
        } else {
            const value = document.createElement('span');
            value.className = 'tree-value ' + type;
            value.textContent = formatValue(data, type);
            item.appendChild(value);
            fragment.appendChild(item);
        }

        // Click handler for details
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectNode(item, data, key, path, type);
        });

        // Store data reference
        item._data = data;
        item._key = key;

        return fragment;
    }

    function getType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    function formatValue(value, type) {
        switch (type) {
            case 'string':
                return `"${value}"`;
            case 'null':
                return 'null';
            default:
                return String(value);
        }
    }

    function selectNode(element, data, key, path, type) {
        // Remove previous selection
        if (selectedNode) {
            selectedNode.classList.remove('selected');
        }
        
        element.classList.add('selected');
        selectedNode = element;

        showDetails(data, key, path, type);
    }

    function showDetails(data, key, path, type) {
        let html = '';

        // Path
        html += `
            <div class="detail-section">
                <div class="detail-label">Path</div>
                <div class="detail-value path">${escapeHtml(path)}</div>
            </div>`;

        // Key
        if (key !== 'root') {
            html += `
                <div class="detail-section">
                    <div class="detail-label">Key</div>
                    <div class="detail-value">${escapeHtml(String(key))}</div>
                </div>`;
        }

        // Type
        html += `
            <div class="detail-section">
                <div class="detail-label">Type</div>
                <span class="detail-type ${type}">${type}</span>
            </div>`;

        // Value / Stats
        if (type === 'object') {
            const keys = Object.keys(data);
            html += `
                <div class="detail-section">
                    <div class="detail-label">Properties</div>
                    <div class="detail-stats">
                        <div class="detail-stat">
                            <span class="detail-stat-value">${keys.length}</span>
                            <span class="detail-stat-label">Keys</span>
                        </div>
                    </div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Keys List</div>
                    <div class="detail-value">${keys.length > 0 ? escapeHtml(keys.join(', ')) : '(empty)'}</div>
                </div>`;
        } else if (type === 'array') {
            html += `
                <div class="detail-section">
                    <div class="detail-label">Length</div>
                    <div class="detail-stats">
                        <div class="detail-stat">
                            <span class="detail-stat-value">${data.length}</span>
                            <span class="detail-stat-label">Items</span>
                        </div>
                    </div>
                </div>`;
        } else {
            html += `
                <div class="detail-section">
                    <div class="detail-label">Value</div>
                    <div class="detail-value">${escapeHtml(formatValue(data, type))}</div>
                </div>`;

            if (type === 'string') {
                html += `
                    <div class="detail-section">
                        <div class="detail-label">String Length</div>
                        <div class="detail-stats">
                            <div class="detail-stat">
                                <span class="detail-stat-value">${data.length}</span>
                                <span class="detail-stat-label">Characters</span>
                            </div>
                        </div>
                    </div>`;
            }
        }

        // Raw JSON preview for objects/arrays
        if (type === 'object' || type === 'array') {
            const preview = JSON.stringify(data, null, 2);
            const truncated = preview.length > 500 ? preview.substring(0, 500) + '...' : preview;
            html += `
                <div class="detail-section">
                    <div class="detail-label">Preview</div>
                    <div class="detail-value" style="white-space: pre-wrap; max-height: 200px; overflow: auto;">${escapeHtml(truncated)}</div>
                </div>`;
        }

        elements.detailsContent.innerHTML = html;
    }

    function resetDetails() {
        selectedNode = null;
        elements.detailsContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">touch_app</span>
                <p>Click on any element to view details</p>
            </div>`;
    }

    function expandAll() {
        const toggles = elements.treeContent.querySelectorAll('.tree-toggle:not(.hidden)');
        const children = elements.treeContent.querySelectorAll('.tree-children');
        
        toggles.forEach(t => t.classList.remove('collapsed'));
        children.forEach(c => c.classList.remove('collapsed'));
    }

    function collapseAll() {
        const toggles = elements.treeContent.querySelectorAll('.tree-toggle:not(.hidden)');
        const children = elements.treeContent.querySelectorAll('.tree-children');
        
        toggles.forEach(t => t.classList.add('collapsed'));
        children.forEach(c => c.classList.add('collapsed'));
    }

    // ============ Schema Generator & Validator ============
    let currentSchema = null;
    let schemaStats = { types: {}, properties: 0, required: 0, depth: 0 };

    function initSchema() {
        elements.generateSchemaBtn.addEventListener('click', () => {
            if (currentJson !== null) {
                generateAndDisplaySchema(currentJson);
                showToast('Schema generated');
            } else {
                showToast('No valid JSON to generate schema from', 'error');
            }
        });
        
        elements.uploadSchemaInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    elements.schemaEditor.value = event.target.result;
                    updateSchemaDisplay();
                    updateSchemaStats();
                    clearValidationResult();
                    showToast('Schema loaded');
                };
                reader.readAsText(file);
                e.target.value = '';
            }
        });
        
        elements.validateBtn.addEventListener('click', validateJsonAgainstSchema);
        elements.copySchemaBtn.addEventListener('click', copySchema);
        elements.downloadSchemaBtn.addEventListener('click', downloadSchema);
        
        // Schema editor input handling
        elements.schemaEditor.addEventListener('input', () => {
            updateSchemaDisplay();
            debounce(() => updateSchemaStats(), 300)();
        });
        
        // Sync scroll between textarea and syntax highlight
        elements.schemaEditorScroll.addEventListener('scroll', () => {
            const scrollTop = elements.schemaEditorScroll.scrollTop;
            elements.schemaLineNumbers.scrollTop = scrollTop;
        }, { passive: true });
        
        // Handle tab key in schema editor
        elements.schemaEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = elements.schemaEditor.selectionStart;
                const end = elements.schemaEditor.selectionEnd;
                elements.schemaEditor.value = elements.schemaEditor.value.substring(0, start) + '  ' + elements.schemaEditor.value.substring(end);
                elements.schemaEditor.selectionStart = elements.schemaEditor.selectionEnd = start + 2;
                updateSchemaDisplay();
            }
        });
    }
    
    function updateSchemaDisplay() {
        updateSchemaLineNumbers();
        updateSchemaSyntaxHighlight();
    }
    
    function updateSchemaLineNumbers() {
        const lines = elements.schemaEditor.value.split('\n');
        let html = '';
        for (let i = 1; i <= lines.length; i++) {
            html += `<span>${i}</span>`;
        }
        elements.schemaLineNumbers.innerHTML = html;
    }
    
    function updateSchemaSyntaxHighlight() {
        const code = elements.schemaEditor.value;
        if (code.length > 500000) {
            // Skip highlighting for very large content
            elements.schemaSyntaxHighlight.textContent = code + '\n';
            return;
        }
        elements.schemaSyntaxHighlight.innerHTML = highlightSyntax(code) + '\n';
    }

    function renderSchema(data) {
        if (data === null || data === undefined) {
            elements.schemaEditor.value = '';
            updateSchemaDisplay();
            elements.schemaInfoContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">info_outline</span>
                    <p>Schema statistics will appear here</p>
                </div>`;
            return;
        }

        generateAndDisplaySchema(data);
    }
    
    function generateAndDisplaySchema(data) {
        // Reset stats
        schemaStats = { types: {}, properties: 0, required: 0, depth: 0 };
        
        // Generate schema
        currentSchema = generateSchema(data, 0);
        currentSchema.$schema = 'https://json-schema.org/draft/2020-12/schema';
        
        // Display in editor
        const schemaJson = JSON.stringify(currentSchema, null, 2);
        elements.schemaEditor.value = schemaJson;
        
        // Update syntax highlighting and line numbers
        updateSchemaDisplay();
        
        // Render stats
        renderSchemaStats();
        
        // Clear previous validation result
        clearValidationResult();
    }
    
    function updateSchemaStats() {
        const schemaText = elements.schemaEditor.value.trim();
        if (!schemaText) {
            elements.schemaInfoContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">info_outline</span>
                    <p>Schema statistics will appear here</p>
                </div>`;
            return;
        }
        
        try {
            const schema = JSON.parse(schemaText);
            schemaStats = { types: {}, properties: 0, required: 0, depth: 0 };
            analyzeSchemaStats(schema, 0);
            renderSchemaStats();
        } catch (e) {
            elements.schemaInfoContent.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons">error_outline</span>
                    <p>Invalid JSON in schema</p>
                </div>`;
        }
    }
    
    function analyzeSchemaStats(schema, depth) {
        if (!schema || typeof schema !== 'object') return;
        
        schemaStats.depth = Math.max(schemaStats.depth, depth);
        
        if (schema.type) {
            schemaStats.types[schema.type] = (schemaStats.types[schema.type] || 0) + 1;
        }
        
        if (schema.properties) {
            const propKeys = Object.keys(schema.properties);
            schemaStats.properties += propKeys.length;
            propKeys.forEach(key => {
                analyzeSchemaStats(schema.properties[key], depth + 1);
            });
        }
        
        if (schema.required && Array.isArray(schema.required)) {
            schemaStats.required += schema.required.length;
        }
        
        if (schema.items) {
            analyzeSchemaStats(schema.items, depth + 1);
        }
        
        if (schema.anyOf) {
            schema.anyOf.forEach(s => analyzeSchemaStats(s, depth));
        }
        
        if (schema.oneOf) {
            schema.oneOf.forEach(s => analyzeSchemaStats(s, depth));
        }
        
        if (schema.allOf) {
            schema.allOf.forEach(s => analyzeSchemaStats(s, depth));
        }
    }
    
    function clearValidationResult() {
        elements.validationContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">pending</span>
                <p>Click Validate to check JSON against schema</p>
            </div>`;
    }
    
    function validateJsonAgainstSchema() {
        const schemaText = elements.schemaEditor.value.trim();
        
        if (!schemaText) {
            showToast('No schema to validate against', 'error');
            return;
        }
        
        let schema;
        try {
            schema = JSON.parse(schemaText);
        } catch (e) {
            elements.validationContent.innerHTML = `
                <div class="validation-result invalid">
                    <span class="material-icons">error</span>
                    <span>Invalid schema JSON: ${escapeHtml(e.message)}</span>
                </div>`;
            return;
        }
        
        if (currentJson === null) {
            elements.validationContent.innerHTML = `
                <div class="validation-result invalid">
                    <span class="material-icons">error</span>
                    <span>No valid JSON data to validate</span>
                </div>`;
            return;
        }
        
        // Perform validation
        const errors = validateValue(currentJson, schema, '');
        
        if (errors.length === 0) {
            elements.validationContent.innerHTML = `
                <div class="validation-result valid">
                    <span class="material-icons">check_circle</span>
                    <span>JSON is valid against schema</span>
                </div>`;
            showToast('Validation passed');
        } else {
            let html = `
                <div class="validation-result invalid">
                    <span class="material-icons">cancel</span>
                    <span>Validation failed (${errors.length} error${errors.length > 1 ? 's' : ''})</span>
                </div>
                <div class="validation-errors">`;
            
            errors.slice(0, 50).forEach(err => {
                html += `
                    <div class="validation-error-item">
                        <span class="validation-error-path">${escapeHtml(err.path || '(root)')}</span>
                        <span class="validation-error-message">${escapeHtml(err.message)}</span>
                    </div>`;
            });
            
            if (errors.length > 50) {
                html += `<div class="validation-error-item">
                    <span class="validation-error-message">...and ${errors.length - 50} more errors</span>
                </div>`;
            }
            
            html += '</div>';
            elements.validationContent.innerHTML = html;
            showToast(`Validation failed: ${errors.length} error(s)`, 'error');
        }
    }
    
    // Simple JSON Schema validator
    function validateValue(value, schema, path) {
        const errors = [];
        
        if (!schema || typeof schema !== 'object') {
            return errors;
        }
        
        // Handle anyOf
        if (schema.anyOf) {
            const anyOfErrors = [];
            let valid = false;
            for (const subSchema of schema.anyOf) {
                const subErrors = validateValue(value, subSchema, path);
                if (subErrors.length === 0) {
                    valid = true;
                    break;
                }
                anyOfErrors.push(...subErrors);
            }
            if (!valid) {
                errors.push({ path, message: 'Does not match any of the allowed schemas' });
            }
            return errors;
        }
        
        // Handle oneOf
        if (schema.oneOf) {
            let matchCount = 0;
            for (const subSchema of schema.oneOf) {
                const subErrors = validateValue(value, subSchema, path);
                if (subErrors.length === 0) matchCount++;
            }
            if (matchCount !== 1) {
                errors.push({ path, message: `Must match exactly one schema (matched ${matchCount})` });
            }
            return errors;
        }
        
        // Handle allOf
        if (schema.allOf) {
            for (const subSchema of schema.allOf) {
                errors.push(...validateValue(value, subSchema, path));
            }
            return errors;
        }
        
        // Type validation
        if (schema.type) {
            const actualType = getJsonType(value);
            const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
            
            if (!expectedTypes.includes(actualType)) {
                // Special case: integer is also a number
                if (!(actualType === 'integer' && expectedTypes.includes('number'))) {
                    errors.push({ path, message: `Expected ${expectedTypes.join(' or ')}, got ${actualType}` });
                    return errors;
                }
            }
        }
        
        // Enum validation
        if (schema.enum) {
            if (!schema.enum.some(e => JSON.stringify(e) === JSON.stringify(value))) {
                errors.push({ path, message: `Value must be one of: ${JSON.stringify(schema.enum)}` });
            }
        }
        
        // Const validation
        if (schema.const !== undefined) {
            if (JSON.stringify(value) !== JSON.stringify(schema.const)) {
                errors.push({ path, message: `Value must be ${JSON.stringify(schema.const)}` });
            }
        }
        
        // String validations
        if (typeof value === 'string') {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                errors.push({ path, message: `String length must be >= ${schema.minLength}` });
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                errors.push({ path, message: `String length must be <= ${schema.maxLength}` });
            }
            if (schema.pattern) {
                try {
                    const regex = new RegExp(schema.pattern);
                    if (!regex.test(value)) {
                        errors.push({ path, message: `String must match pattern: ${schema.pattern}` });
                    }
                } catch (e) {
                    // Invalid regex in schema
                }
            }
        }
        
        // Number validations
        if (typeof value === 'number') {
            if (schema.minimum !== undefined && value < schema.minimum) {
                errors.push({ path, message: `Value must be >= ${schema.minimum}` });
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
                errors.push({ path, message: `Value must be <= ${schema.maximum}` });
            }
            if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
                errors.push({ path, message: `Value must be > ${schema.exclusiveMinimum}` });
            }
            if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
                errors.push({ path, message: `Value must be < ${schema.exclusiveMaximum}` });
            }
            if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
                errors.push({ path, message: `Value must be multiple of ${schema.multipleOf}` });
            }
        }
        
        // Array validations
        if (Array.isArray(value)) {
            if (schema.minItems !== undefined && value.length < schema.minItems) {
                errors.push({ path, message: `Array must have >= ${schema.minItems} items` });
            }
            if (schema.maxItems !== undefined && value.length > schema.maxItems) {
                errors.push({ path, message: `Array must have <= ${schema.maxItems} items` });
            }
            if (schema.uniqueItems && new Set(value.map(JSON.stringify)).size !== value.length) {
                errors.push({ path, message: 'Array items must be unique' });
            }
            
            // Validate items
            if (schema.items) {
                value.forEach((item, index) => {
                    const itemPath = path ? `${path}[${index}]` : `[${index}]`;
                    errors.push(...validateValue(item, schema.items, itemPath));
                });
            }
        }
        
        // Object validations
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            const keys = Object.keys(value);
            
            // Required properties
            if (schema.required) {
                for (const req of schema.required) {
                    if (!(req in value)) {
                        errors.push({ path, message: `Missing required property: ${req}` });
                    }
                }
            }
            
            // Property count
            if (schema.minProperties !== undefined && keys.length < schema.minProperties) {
                errors.push({ path, message: `Object must have >= ${schema.minProperties} properties` });
            }
            if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) {
                errors.push({ path, message: `Object must have <= ${schema.maxProperties} properties` });
            }
            
            // Validate properties
            if (schema.properties) {
                for (const key of keys) {
                    if (schema.properties[key]) {
                        const propPath = path ? `${path}.${key}` : key;
                        errors.push(...validateValue(value[key], schema.properties[key], propPath));
                    }
                }
            }
            
            // Additional properties
            if (schema.additionalProperties === false) {
                const allowedKeys = Object.keys(schema.properties || {});
                const patternKeys = schema.patternProperties ? Object.keys(schema.patternProperties) : [];
                
                for (const key of keys) {
                    if (!allowedKeys.includes(key)) {
                        let matchesPattern = false;
                        for (const pattern of patternKeys) {
                            try {
                                if (new RegExp(pattern).test(key)) {
                                    matchesPattern = true;
                                    break;
                                }
                            } catch (e) {}
                        }
                        if (!matchesPattern) {
                            errors.push({ path, message: `Additional property not allowed: ${key}` });
                        }
                    }
                }
            }
        }
        
        return errors;
    }
    
    function getJsonType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'number') {
            return Number.isInteger(value) ? 'integer' : 'number';
        }
        return typeof value;
    }
    
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function generateSchema(value, depth) {
        schemaStats.depth = Math.max(schemaStats.depth, depth);
        const type = getType(value);
        
        // Count types
        schemaStats.types[type] = (schemaStats.types[type] || 0) + 1;

        switch (type) {
            case 'null':
                return { type: 'null' };
            
            case 'boolean':
                return { type: 'boolean' };
            
            case 'number':
                if (Number.isInteger(value)) {
                    return { type: 'integer' };
                }
                return { type: 'number' };
            
            case 'string':
                const schema = { type: 'string' };
                // Detect common formats
                if (isDateTimeString(value)) {
                    schema.format = 'date-time';
                } else if (isDateString(value)) {
                    schema.format = 'date';
                } else if (isEmailString(value)) {
                    schema.format = 'email';
                } else if (isUriString(value)) {
                    schema.format = 'uri';
                } else if (isUuidString(value)) {
                    schema.format = 'uuid';
                }
                return schema;
            
            case 'array':
                if (value.length === 0) {
                    return { type: 'array', items: {} };
                }
                // Analyze all items to create a unified schema
                const itemSchemas = value.map(item => generateSchema(item, depth + 1));
                const mergedItems = mergeSchemas(itemSchemas);
                return { type: 'array', items: mergedItems };
            
            case 'object':
                const properties = {};
                const required = [];
                
                for (const key of Object.keys(value)) {
                    schemaStats.properties++;
                    properties[key] = generateSchema(value[key], depth + 1);
                    required.push(key);
                    schemaStats.required++;
                }
                
                const objSchema = { type: 'object' };
                if (Object.keys(properties).length > 0) {
                    objSchema.properties = properties;
                    objSchema.required = required;
                }
                return objSchema;
            
            default:
                return {};
        }
    }

    function mergeSchemas(schemas) {
        if (schemas.length === 0) return {};
        if (schemas.length === 1) return schemas[0];
        
        // Get unique types
        const types = [...new Set(schemas.map(s => s.type))];
        
        if (types.length === 1) {
            // All same type - merge properties if objects
            if (types[0] === 'object') {
                const merged = { type: 'object', properties: {} };
                const allRequired = new Set();
                const propCounts = {};
                
                schemas.forEach(schema => {
                    if (schema.properties) {
                        Object.keys(schema.properties).forEach(key => {
                            propCounts[key] = (propCounts[key] || 0) + 1;
                            if (!merged.properties[key]) {
                                merged.properties[key] = schema.properties[key];
                            }
                        });
                    }
                });
                
                // Only mark as required if present in all items
                const requiredProps = Object.keys(propCounts).filter(
                    key => propCounts[key] === schemas.length
                );
                if (requiredProps.length > 0) {
                    merged.required = requiredProps;
                }
                
                return merged;
            }
            return schemas[0];
        }
        
        // Multiple types - use anyOf
        return { anyOf: schemas };
    }

    // Format detection helpers
    function isDateTimeString(str) {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
    }

    function isDateString(str) {
        return /^\d{4}-\d{2}-\d{2}$/.test(str);
    }

    function isEmailString(str) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }

    function isUriString(str) {
        return /^https?:\/\//.test(str);
    }

    function isUuidString(str) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    }

    function renderSchemaStats() {
        let html = '';
        
        // Stats grid
        html += '<div class="schema-stat-grid">';
        html += `
            <div class="schema-stat-card">
                <div class="stat-value">${schemaStats.properties}</div>
                <div class="stat-label">Properties</div>
            </div>
            <div class="schema-stat-card">
                <div class="stat-value">${schemaStats.required}</div>
                <div class="stat-label">Required</div>
            </div>
            <div class="schema-stat-card">
                <div class="stat-value">${schemaStats.depth}</div>
                <div class="stat-label">Max Depth</div>
            </div>
            <div class="schema-stat-card">
                <div class="stat-value">${Object.keys(schemaStats.types).length}</div>
                <div class="stat-label">Type Count</div>
            </div>
        `;
        html += '</div>';
        
        // Type breakdown
        html += '<div class="detail-section"><div class="detail-label">Types Used</div></div>';
        html += '<ul class="schema-type-list">';
        
        const typeOrder = ['object', 'array', 'string', 'number', 'boolean', 'null'];
        const sortedTypes = Object.entries(schemaStats.types).sort((a, b) => {
            return typeOrder.indexOf(a[0]) - typeOrder.indexOf(b[0]);
        });
        
        for (const [type, count] of sortedTypes) {
            html += `
                <li class="schema-type-item ${type}">
                    <span class="type-name">${type}</span>
                    <span class="type-count">${count} occurrence${count > 1 ? 's' : ''}</span>
                </li>`;
        }
        html += '</ul>';
        
        elements.schemaInfoContent.innerHTML = html;
    }

    function copySchema() {
        const schemaText = elements.schemaEditor.value.trim();
        if (!schemaText) {
            showToast('No schema to copy', 'error');
            return;
        }
        
        navigator.clipboard.writeText(schemaText).then(() => {
            showToast('Schema copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    function downloadSchema() {
        const schemaText = elements.schemaEditor.value.trim();
        if (!schemaText) {
            showToast('No schema to download', 'error');
            return;
        }
        
        const blob = new Blob([schemaText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schema.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Schema downloaded', 'success');
    }

    // ============ BSON Converter ============
    let currentBsonData = null;

    function initBson() {
        elements.copyBsonBtn.addEventListener('click', copyBsonHex);
        elements.downloadBsonBtn.addEventListener('click', downloadBson);
        elements.uploadBsonInput.addEventListener('change', uploadBson);
    }

    function renderBson(data) {
        if (data === null || data === undefined) {
            showBsonEmpty();
            return;
        }

        try {
            currentBsonData = encodeBson(data);
            const hexOutput = formatHexDump(currentBsonData);
            elements.bsonContent.innerHTML = `<pre class="bson-hex">${hexOutput}</pre>`;
            
            renderBsonStats(data);
        } catch (e) {
            showBsonError('BSON encoding error: ' + e.message);
        }
    }

    function showBsonError(error) {
        elements.bsonContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
        elements.bsonInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate BSON</p>
            </div>`;
        currentBsonData = null;
    }

    function showBsonEmpty() {
        elements.bsonContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to generate BSON</p>
            </div>`;
        elements.bsonInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">compare_arrows</span>
                <p>Size statistics will appear here</p>
            </div>`;
        currentBsonData = null;
    }

    // Lightweight BSON encoder
    function encodeBson(obj) {
        const parts = [];
        
        function writeInt32(value) {
            const buf = new Uint8Array(4);
            buf[0] = value & 0xff;
            buf[1] = (value >> 8) & 0xff;
            buf[2] = (value >> 16) & 0xff;
            buf[3] = (value >> 24) & 0xff;
            return buf;
        }
        
        function writeInt64(value) {
            const buf = new Uint8Array(8);
            // Handle as two 32-bit parts for larger numbers
            const low = value & 0xffffffff;
            const high = Math.floor(value / 0x100000000) & 0xffffffff;
            buf[0] = low & 0xff;
            buf[1] = (low >> 8) & 0xff;
            buf[2] = (low >> 16) & 0xff;
            buf[3] = (low >> 24) & 0xff;
            buf[4] = high & 0xff;
            buf[5] = (high >> 8) & 0xff;
            buf[6] = (high >> 16) & 0xff;
            buf[7] = (high >> 24) & 0xff;
            return buf;
        }
        
        function writeDouble(value) {
            const buf = new ArrayBuffer(8);
            new Float64Array(buf)[0] = value;
            return new Uint8Array(buf);
        }
        
        function writeCString(str) {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(str);
            const buf = new Uint8Array(encoded.length + 1);
            buf.set(encoded);
            buf[encoded.length] = 0;
            return buf;
        }
        
        function writeString(str) {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(str);
            const len = writeInt32(encoded.length + 1);
            const buf = new Uint8Array(4 + encoded.length + 1);
            buf.set(len);
            buf.set(encoded, 4);
            buf[4 + encoded.length] = 0;
            return buf;
        }
        
        function encodeValue(key, value) {
            const keyBytes = writeCString(key);
            const type = getType(value);
            
            switch (type) {
                case 'number':
                    if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) {
                        // Int32
                        return concatArrays([new Uint8Array([0x10]), keyBytes, writeInt32(value)]);
                    } else if (Number.isInteger(value)) {
                        // Int64
                        return concatArrays([new Uint8Array([0x12]), keyBytes, writeInt64(value)]);
                    } else {
                        // Double
                        return concatArrays([new Uint8Array([0x01]), keyBytes, writeDouble(value)]);
                    }
                
                case 'string':
                    return concatArrays([new Uint8Array([0x02]), keyBytes, writeString(value)]);
                
                case 'boolean':
                    return concatArrays([new Uint8Array([0x08]), keyBytes, new Uint8Array([value ? 1 : 0])]);
                
                case 'null':
                    return concatArrays([new Uint8Array([0x0A]), keyBytes]);
                
                case 'array':
                    const arrDoc = encodeDocument(value, true);
                    return concatArrays([new Uint8Array([0x04]), keyBytes, arrDoc]);
                
                case 'object':
                    const objDoc = encodeDocument(value, false);
                    return concatArrays([new Uint8Array([0x03]), keyBytes, objDoc]);
                
                default:
                    return new Uint8Array(0);
            }
        }
        
        function encodeDocument(obj, isArray) {
            const elements = [];
            const keys = isArray ? Object.keys(obj).map((_, i) => String(i)) : Object.keys(obj);
            const values = isArray ? obj : keys.map(k => obj[k]);
            
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const val = isArray ? obj[i] : obj[key];
                elements.push(encodeValue(key, val));
            }
            
            const body = concatArrays(elements);
            const totalLen = 4 + body.length + 1; // size + body + null terminator
            
            return concatArrays([writeInt32(totalLen), body, new Uint8Array([0x00])]);
        }
        
        function concatArrays(arrays) {
            const totalLen = arrays.reduce((sum, arr) => sum + arr.length, 0);
            const result = new Uint8Array(totalLen);
            let offset = 0;
            for (const arr of arrays) {
                result.set(arr, offset);
                offset += arr.length;
            }
            return result;
        }
        
        return encodeDocument(obj, false);
    }

    // BSON decoder (for upload)
    function decodeBson(buffer) {
        let offset = 0;
        const view = new DataView(buffer);
        
        function readInt32() {
            const val = view.getInt32(offset, true);
            offset += 4;
            return val;
        }
        
        function readInt64() {
            const low = view.getUint32(offset, true);
            const high = view.getInt32(offset + 4, true);
            offset += 8;
            return high * 0x100000000 + low;
        }
        
        function readDouble() {
            const val = view.getFloat64(offset, true);
            offset += 8;
            return val;
        }
        
        function readCString() {
            let end = offset;
            while (view.getUint8(end) !== 0) end++;
            const bytes = new Uint8Array(buffer, offset, end - offset);
            offset = end + 1;
            return new TextDecoder().decode(bytes);
        }
        
        function readString() {
            const len = readInt32();
            const bytes = new Uint8Array(buffer, offset, len - 1);
            offset += len;
            return new TextDecoder().decode(bytes);
        }
        
        function readDocument() {
            const startOffset = offset;
            const size = readInt32();
            const obj = {};
            const isArray = [];
            let arrayMode = true;
            let idx = 0;
            
            while (offset < startOffset + size - 1) {
                const type = view.getUint8(offset++);
                if (type === 0) break;
                
                const key = readCString();
                if (arrayMode && key !== String(idx)) arrayMode = false;
                idx++;
                
                let value;
                switch (type) {
                    case 0x01: value = readDouble(); break;
                    case 0x02: value = readString(); break;
                    case 0x03: value = readDocument(); break;
                    case 0x04: value = Object.values(readDocument()); break;
                    case 0x08: value = view.getUint8(offset++) === 1; break;
                    case 0x0A: value = null; break;
                    case 0x10: value = readInt32(); break;
                    case 0x12: value = readInt64(); break;
                    default: throw new Error('Unsupported BSON type: 0x' + type.toString(16));
                }
                obj[key] = value;
                isArray.push(key);
            }
            
            offset = startOffset + size;
            
            // Check if it's an array
            if (arrayMode && isArray.every((k, i) => k === String(i))) {
                return isArray.map(k => obj[k]);
            }
            return obj;
        }
        
        return readDocument();
    }

    function formatHexDump(data) {
        const lines = [];
        const bytesPerLine = 16;
        
        for (let i = 0; i < data.length; i += bytesPerLine) {
            const offset = i.toString(16).padStart(8, '0');
            const chunk = data.slice(i, i + bytesPerLine);
            
            const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const hexPadded = hex.padEnd(bytesPerLine * 3 - 1, ' ');
            
            const ascii = Array.from(chunk).map(b => 
                b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'
            ).join('');
            
            lines.push(
                `<span class="offset">${offset}</span>  ` +
                `<span class="hex-byte">${hexPadded}</span>` +
                `<span class="ascii">${escapeHtml(ascii)}</span>`
            );
        }
        
        return lines.join('\n');
    }

    function renderBsonStats(jsonData) {
        const jsonStr = JSON.stringify(jsonData);
        const jsonSize = new TextEncoder().encode(jsonStr).length;
        const bsonSize = currentBsonData.length;
        const diff = jsonSize - bsonSize;
        const diffPercent = ((diff / jsonSize) * 100).toFixed(1);
        
        const maxSize = Math.max(jsonSize, bsonSize);
        const jsonWidth = (jsonSize / maxSize * 100).toFixed(0);
        const bsonWidth = (bsonSize / maxSize * 100).toFixed(0);
        
        let html = '<div class="size-comparison">';
        
        // JSON bar
        html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">JSON</span>
                    <span class="value">${formatBytes(jsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill json" style="width: ${jsonWidth}%"></div>
                </div>
            </div>`;
        
        // BSON bar
        html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">BSON</span>
                    <span class="value">${formatBytes(bsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill bson" style="width: ${bsonWidth}%"></div>
                </div>
            </div>`;
        
        // Difference
        const isSmaller = diff > 0;
        html += `
            <div class="size-diff">
                <div class="diff-value ${isSmaller ? 'positive' : 'negative'}">
                    ${isSmaller ? '-' : '+'}${formatBytes(Math.abs(diff))} (${Math.abs(diffPercent)}%)
                </div>
                <div class="diff-label">${isSmaller ? 'BSON smaller' : 'BSON larger'}</div>
            </div>`;
        
        html += '</div>';
        
        // Additional info
        html += `
            <div class="detail-section">
                <div class="detail-label">Format Details</div>
                <div class="detail-value" style="font-size: 10px;">
                    BSON includes type info for each value, making it self-describing but sometimes larger for simple data.
                </div>
            </div>`;
        
        elements.bsonInfoContent.innerHTML = html;
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function copyBsonHex() {
        if (!currentBsonData) {
            showToast('No BSON data to copy', 'error');
            return;
        }
        
        const hex = Array.from(currentBsonData).map(b => b.toString(16).padStart(2, '0')).join('');
        navigator.clipboard.writeText(hex).then(() => {
            showToast('Hex copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    function downloadBson() {
        if (!currentBsonData) {
            showToast('No BSON data to download', 'error');
            return;
        }
        
        const blob = new Blob([currentBsonData], { type: 'application/bson' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.bson';
        a.click();
        URL.revokeObjectURL(url);
        showToast('BSON downloaded', 'success');
    }

    function uploadBson(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const buffer = e.target.result;
                const decoded = decodeBson(buffer);
                
                // Update the JSON editor
                elements.editor.value = JSON.stringify(decoded, null, 2);
                handleEditorInput();
                
                // Switch to JSON tab
                switchTab('json');
                showToast('BSON loaded successfully', 'success');
            } catch (err) {
                showToast('Failed to parse BSON: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        
        // Reset input
        event.target.value = '';
    }

    // ============ MsgPack Converter ============
    let currentMsgpackData = null;

    function initMsgpack() {
        elements.copyMsgpackBtn.addEventListener('click', copyMsgpackHex);
        elements.downloadMsgpackBtn.addEventListener('click', downloadMsgpack);
        elements.uploadMsgpackInput.addEventListener('change', uploadMsgpack);
    }

    function renderMsgpack(data) {
        if (data === null || data === undefined) {
            showMsgpackEmpty();
            return;
        }

        try {
            currentMsgpackData = encodeMsgpack(data);
            const hexOutput = formatHexDump(currentMsgpackData);
            elements.msgpackContent.innerHTML = `<pre class="bson-hex">${hexOutput}</pre>`;
            
            renderMsgpackStats(data);
        } catch (e) {
            showMsgpackError('MsgPack encoding error: ' + e.message);
        }
    }

    function showMsgpackError(error) {
        elements.msgpackContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
        elements.msgpackInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate MsgPack</p>
            </div>`;
        currentMsgpackData = null;
    }

    function showMsgpackEmpty() {
        elements.msgpackContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to generate MsgPack</p>
            </div>`;
        elements.msgpackInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">compare_arrows</span>
                <p>Size statistics will appear here</p>
            </div>`;
        currentMsgpackData = null;
    }

    // Lightweight MsgPack encoder
    function encodeMsgpack(value) {
        const parts = [];
        
        function encode(val) {
            const type = getType(val);
            
            switch (type) {
                case 'null':
                    return new Uint8Array([0xc0]);
                
                case 'boolean':
                    return new Uint8Array([val ? 0xc3 : 0xc2]);
                
                case 'number':
                    if (Number.isInteger(val)) {
                        if (val >= 0 && val <= 127) {
                            // positive fixint
                            return new Uint8Array([val]);
                        } else if (val >= -32 && val < 0) {
                            // negative fixint
                            return new Uint8Array([val & 0xff]);
                        } else if (val >= 0 && val <= 0xff) {
                            // uint8
                            return new Uint8Array([0xcc, val]);
                        } else if (val >= 0 && val <= 0xffff) {
                            // uint16
                            return new Uint8Array([0xcd, (val >> 8) & 0xff, val & 0xff]);
                        } else if (val >= 0 && val <= 0xffffffff) {
                            // uint32
                            return new Uint8Array([0xce, (val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff]);
                        } else if (val >= -128 && val < 0) {
                            // int8
                            return new Uint8Array([0xd0, val & 0xff]);
                        } else if (val >= -32768 && val < 0) {
                            // int16
                            const buf = new Uint8Array(3);
                            buf[0] = 0xd1;
                            buf[1] = (val >> 8) & 0xff;
                            buf[2] = val & 0xff;
                            return buf;
                        } else if (val >= -2147483648 && val < 0) {
                            // int32
                            const buf = new Uint8Array(5);
                            buf[0] = 0xd2;
                            buf[1] = (val >> 24) & 0xff;
                            buf[2] = (val >> 16) & 0xff;
                            buf[3] = (val >> 8) & 0xff;
                            buf[4] = val & 0xff;
                            return buf;
                        } else {
                            // float64 for large integers
                            const buf = new Uint8Array(9);
                            buf[0] = 0xcb;
                            const view = new DataView(buf.buffer);
                            view.setFloat64(1, val, false);
                            return buf;
                        }
                    } else {
                        // float64
                        const buf = new Uint8Array(9);
                        buf[0] = 0xcb;
                        const view = new DataView(buf.buffer);
                        view.setFloat64(1, val, false);
                        return buf;
                    }
                
                case 'string':
                    const encoder = new TextEncoder();
                    const strBytes = encoder.encode(val);
                    const len = strBytes.length;
                    
                    if (len <= 31) {
                        // fixstr
                        const buf = new Uint8Array(1 + len);
                        buf[0] = 0xa0 | len;
                        buf.set(strBytes, 1);
                        return buf;
                    } else if (len <= 0xff) {
                        // str8
                        const buf = new Uint8Array(2 + len);
                        buf[0] = 0xd9;
                        buf[1] = len;
                        buf.set(strBytes, 2);
                        return buf;
                    } else if (len <= 0xffff) {
                        // str16
                        const buf = new Uint8Array(3 + len);
                        buf[0] = 0xda;
                        buf[1] = (len >> 8) & 0xff;
                        buf[2] = len & 0xff;
                        buf.set(strBytes, 3);
                        return buf;
                    } else {
                        // str32
                        const buf = new Uint8Array(5 + len);
                        buf[0] = 0xdb;
                        buf[1] = (len >> 24) & 0xff;
                        buf[2] = (len >> 16) & 0xff;
                        buf[3] = (len >> 8) & 0xff;
                        buf[4] = len & 0xff;
                        buf.set(strBytes, 5);
                        return buf;
                    }
                
                case 'array':
                    const arrLen = val.length;
                    let arrHeader;
                    
                    if (arrLen <= 15) {
                        arrHeader = new Uint8Array([0x90 | arrLen]);
                    } else if (arrLen <= 0xffff) {
                        arrHeader = new Uint8Array([0xdc, (arrLen >> 8) & 0xff, arrLen & 0xff]);
                    } else {
                        arrHeader = new Uint8Array([0xdd, (arrLen >> 24) & 0xff, (arrLen >> 16) & 0xff, (arrLen >> 8) & 0xff, arrLen & 0xff]);
                    }
                    
                    const arrParts = [arrHeader];
                    for (const item of val) {
                        arrParts.push(encode(item));
                    }
                    return concatArraysMsgpack(arrParts);
                
                case 'object':
                    const keys = Object.keys(val);
                    const mapLen = keys.length;
                    let mapHeader;
                    
                    if (mapLen <= 15) {
                        mapHeader = new Uint8Array([0x80 | mapLen]);
                    } else if (mapLen <= 0xffff) {
                        mapHeader = new Uint8Array([0xde, (mapLen >> 8) & 0xff, mapLen & 0xff]);
                    } else {
                        mapHeader = new Uint8Array([0xdf, (mapLen >> 24) & 0xff, (mapLen >> 16) & 0xff, (mapLen >> 8) & 0xff, mapLen & 0xff]);
                    }
                    
                    const mapParts = [mapHeader];
                    for (const key of keys) {
                        mapParts.push(encode(key));
                        mapParts.push(encode(val[key]));
                    }
                    return concatArraysMsgpack(mapParts);
                
                default:
                    return new Uint8Array(0);
            }
        }
        
        return encode(value);
    }
    
    function concatArraysMsgpack(arrays) {
        const totalLen = arrays.reduce((sum, arr) => sum + arr.length, 0);
        const result = new Uint8Array(totalLen);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    // MsgPack decoder
    function decodeMsgpack(buffer) {
        let offset = 0;
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        
        function decode() {
            const byte = bytes[offset++];
            
            // positive fixint
            if (byte <= 0x7f) return byte;
            
            // fixmap
            if ((byte & 0xf0) === 0x80) {
                const len = byte & 0x0f;
                const obj = {};
                for (let i = 0; i < len; i++) {
                    const key = decode();
                    obj[key] = decode();
                }
                return obj;
            }
            
            // fixarray
            if ((byte & 0xf0) === 0x90) {
                const len = byte & 0x0f;
                const arr = [];
                for (let i = 0; i < len; i++) {
                    arr.push(decode());
                }
                return arr;
            }
            
            // fixstr
            if ((byte & 0xe0) === 0xa0) {
                const len = byte & 0x1f;
                const str = new TextDecoder().decode(bytes.slice(offset, offset + len));
                offset += len;
                return str;
            }
            
            // negative fixint
            if ((byte & 0xe0) === 0xe0) {
                return byte - 256;
            }
            
            switch (byte) {
                case 0xc0: return null;
                case 0xc2: return false;
                case 0xc3: return true;
                
                case 0xcc: return bytes[offset++]; // uint8
                case 0xcd: { // uint16
                    const val = view.getUint16(offset, false);
                    offset += 2;
                    return val;
                }
                case 0xce: { // uint32
                    const val = view.getUint32(offset, false);
                    offset += 4;
                    return val;
                }
                
                case 0xd0: { // int8
                    const val = view.getInt8(offset);
                    offset += 1;
                    return val;
                }
                case 0xd1: { // int16
                    const val = view.getInt16(offset, false);
                    offset += 2;
                    return val;
                }
                case 0xd2: { // int32
                    const val = view.getInt32(offset, false);
                    offset += 4;
                    return val;
                }
                
                case 0xcb: { // float64
                    const val = view.getFloat64(offset, false);
                    offset += 8;
                    return val;
                }
                
                case 0xd9: { // str8
                    const len = bytes[offset++];
                    const str = new TextDecoder().decode(bytes.slice(offset, offset + len));
                    offset += len;
                    return str;
                }
                case 0xda: { // str16
                    const len = view.getUint16(offset, false);
                    offset += 2;
                    const str = new TextDecoder().decode(bytes.slice(offset, offset + len));
                    offset += len;
                    return str;
                }
                case 0xdb: { // str32
                    const len = view.getUint32(offset, false);
                    offset += 4;
                    const str = new TextDecoder().decode(bytes.slice(offset, offset + len));
                    offset += len;
                    return str;
                }
                
                case 0xdc: { // array16
                    const len = view.getUint16(offset, false);
                    offset += 2;
                    const arr = [];
                    for (let i = 0; i < len; i++) arr.push(decode());
                    return arr;
                }
                case 0xdd: { // array32
                    const len = view.getUint32(offset, false);
                    offset += 4;
                    const arr = [];
                    for (let i = 0; i < len; i++) arr.push(decode());
                    return arr;
                }
                
                case 0xde: { // map16
                    const len = view.getUint16(offset, false);
                    offset += 2;
                    const obj = {};
                    for (let i = 0; i < len; i++) {
                        const key = decode();
                        obj[key] = decode();
                    }
                    return obj;
                }
                case 0xdf: { // map32
                    const len = view.getUint32(offset, false);
                    offset += 4;
                    const obj = {};
                    for (let i = 0; i < len; i++) {
                        const key = decode();
                        obj[key] = decode();
                    }
                    return obj;
                }
                
                default:
                    throw new Error('Unsupported MsgPack type: 0x' + byte.toString(16));
            }
        }
        
        return decode();
    }

    function renderMsgpackStats(jsonData) {
        const jsonStr = JSON.stringify(jsonData);
        const jsonSize = new TextEncoder().encode(jsonStr).length;
        const msgpackSize = currentMsgpackData.length;
        const diff = jsonSize - msgpackSize;
        const diffPercent = ((diff / jsonSize) * 100).toFixed(1);
        
        const maxSize = Math.max(jsonSize, msgpackSize);
        const jsonWidth = (jsonSize / maxSize * 100).toFixed(0);
        const msgpackWidth = (msgpackSize / maxSize * 100).toFixed(0);
        
        let html = '<div class="size-comparison">';
        
        // JSON bar
        html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">JSON</span>
                    <span class="value">${formatBytes(jsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill json" style="width: ${jsonWidth}%"></div>
                </div>
            </div>`;
        
        // MsgPack bar
        html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">MsgPack</span>
                    <span class="value">${formatBytes(msgpackSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill bson" style="width: ${msgpackWidth}%"></div>
                </div>
            </div>`;
        
        // Difference
        const isSmaller = diff > 0;
        html += `
            <div class="size-diff">
                <div class="diff-value ${isSmaller ? 'positive' : 'negative'}">
                    ${isSmaller ? '-' : '+'}${formatBytes(Math.abs(diff))} (${Math.abs(diffPercent)}%)
                </div>
                <div class="diff-label">${isSmaller ? 'MsgPack smaller' : 'MsgPack larger'}</div>
            </div>`;
        
        html += '</div>';
        
        // Additional info
        html += `
            <div class="detail-section">
                <div class="detail-label">Format Details</div>
                <div class="detail-value" style="font-size: 10px;">
                    MsgPack is highly optimized for size. Small integers use 1 byte, short strings have minimal overhead.
                </div>
            </div>`;
        
        elements.msgpackInfoContent.innerHTML = html;
    }

    function copyMsgpackHex() {
        if (!currentMsgpackData) {
            showToast('No MsgPack data to copy', 'error');
            return;
        }
        
        const hex = Array.from(currentMsgpackData).map(b => b.toString(16).padStart(2, '0')).join('');
        navigator.clipboard.writeText(hex).then(() => {
            showToast('Hex copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    function downloadMsgpack() {
        if (!currentMsgpackData) {
            showToast('No MsgPack data to download', 'error');
            return;
        }
        
        const blob = new Blob([currentMsgpackData], { type: 'application/msgpack' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.msgpack';
        a.click();
        URL.revokeObjectURL(url);
        showToast('MsgPack downloaded', 'success');
    }

    function uploadMsgpack(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const buffer = e.target.result;
                const decoded = decodeMsgpack(buffer);
                
                // Update the JSON editor
                elements.editor.value = JSON.stringify(decoded, null, 2);
                handleEditorInput();
                
                // Switch to JSON tab
                switchTab('json');
                showToast('MsgPack loaded successfully', 'success');
            } catch (err) {
                showToast('Failed to parse MsgPack: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        
        // Reset input
        event.target.value = '';
    }

    // ============ CBOR Converter ============
    let currentCborData = null;

    function initCbor() {
        elements.copyCborBtn.addEventListener('click', copyCborHex);
        elements.downloadCborBtn.addEventListener('click', downloadCbor);
        elements.uploadCborInput.addEventListener('change', uploadCbor);
    }

    function renderCbor(data) {
        if (data === null || data === undefined) {
            showCborEmpty();
            return;
        }

        try {
            currentCborData = encodeCbor(data);
            const hexOutput = formatHexDump(currentCborData);
            elements.cborContent.innerHTML = `<pre class="bson-hex">${hexOutput}</pre>`;
            
            renderCborStats(data);
        } catch (e) {
            showCborError('CBOR encoding error: ' + e.message);
        }
    }

    function showCborError(error) {
        elements.cborContent.innerHTML = `
            <div class="empty-state error-state">
                <span class="material-icons">error_outline</span>
                <p>Invalid JSON</p>
                <p class="error-message">${escapeHtml(error)}</p>
            </div>`;
        elements.cborInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">block</span>
                <p>Fix JSON errors to generate CBOR</p>
            </div>`;
        currentCborData = null;
    }

    function showCborEmpty() {
        elements.cborContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">info_outline</span>
                <p>Enter valid JSON in the editor to generate CBOR</p>
            </div>`;
        elements.cborInfoContent.innerHTML = `
            <div class="empty-state">
                <span class="material-icons">compare_arrows</span>
                <p>Size statistics will appear here</p>
            </div>`;
        currentCborData = null;
    }

    // CBOR Encoder (RFC 8949)
    function encodeCbor(value) {
        function encode(val) {
            const type = getType(val);
            
            switch (type) {
                case 'null':
                    return new Uint8Array([0xf6]); // simple value null
                
                case 'boolean':
                    return new Uint8Array([val ? 0xf5 : 0xf4]); // true: 0xf5, false: 0xf4
                
                case 'number':
                    if (Number.isInteger(val)) {
                        if (val >= 0) {
                            return encodeUnsigned(0, val); // major type 0
                        } else {
                            return encodeUnsigned(1, -1 - val); // major type 1 (negative)
                        }
                    } else {
                        // Float64
                        const buf = new ArrayBuffer(9);
                        const view = new DataView(buf);
                        view.setUint8(0, 0xfb); // float64 marker
                        view.setFloat64(1, val, false); // big-endian
                        return new Uint8Array(buf);
                    }
                
                case 'string':
                    const strBytes = new TextEncoder().encode(val);
                    const strHeader = encodeUnsigned(3, strBytes.length); // major type 3
                    const strResult = new Uint8Array(strHeader.length + strBytes.length);
                    strResult.set(strHeader);
                    strResult.set(strBytes, strHeader.length);
                    return strResult;
                
                case 'array':
                    const arrHeader = encodeUnsigned(4, val.length); // major type 4
                    const arrParts = [arrHeader];
                    for (const item of val) {
                        arrParts.push(encode(item));
                    }
                    return concatArrays(arrParts);
                
                case 'object':
                    const keys = Object.keys(val);
                    const mapHeader = encodeUnsigned(5, keys.length); // major type 5
                    const mapParts = [mapHeader];
                    for (const key of keys) {
                        mapParts.push(encode(key)); // key as string
                        mapParts.push(encode(val[key])); // value
                    }
                    return concatArrays(mapParts);
                
                default:
                    throw new Error('Unsupported type: ' + type);
            }
        }
        
        function encodeUnsigned(majorType, value) {
            const mt = majorType << 5;
            if (value < 24) {
                return new Uint8Array([mt | value]);
            } else if (value < 0x100) {
                return new Uint8Array([mt | 24, value]);
            } else if (value < 0x10000) {
                return new Uint8Array([mt | 25, (value >> 8) & 0xff, value & 0xff]);
            } else if (value < 0x100000000) {
                return new Uint8Array([mt | 26, (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
            } else {
                // 64-bit
                const buf = new Uint8Array(9);
                buf[0] = mt | 27;
                const high = Math.floor(value / 0x100000000);
                const low = value >>> 0;
                buf[1] = (high >> 24) & 0xff;
                buf[2] = (high >> 16) & 0xff;
                buf[3] = (high >> 8) & 0xff;
                buf[4] = high & 0xff;
                buf[5] = (low >> 24) & 0xff;
                buf[6] = (low >> 16) & 0xff;
                buf[7] = (low >> 8) & 0xff;
                buf[8] = low & 0xff;
                return buf;
            }
        }
        
        function concatArrays(arrays) {
            const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const arr of arrays) {
                result.set(arr, offset);
                offset += arr.length;
            }
            return result;
        }
        
        return encode(value);
    }

    // CBOR Decoder
    function decodeCbor(buffer) {
        const data = new Uint8Array(buffer);
        let offset = 0;
        
        function decode() {
            if (offset >= data.length) throw new Error('Unexpected end of CBOR data');
            
            const initial = data[offset++];
            const majorType = initial >> 5;
            const additionalInfo = initial & 0x1f;
            
            let value = readLength(additionalInfo);
            
            switch (majorType) {
                case 0: // unsigned integer
                    return value;
                
                case 1: // negative integer
                    return -1 - value;
                
                case 2: // byte string
                    const bytes = data.slice(offset, offset + value);
                    offset += value;
                    return Array.from(bytes); // Return as array of numbers
                
                case 3: // text string
                    const strBytes = data.slice(offset, offset + value);
                    offset += value;
                    return new TextDecoder().decode(strBytes);
                
                case 4: // array
                    const arr = [];
                    for (let i = 0; i < value; i++) {
                        arr.push(decode());
                    }
                    return arr;
                
                case 5: // map
                    const obj = {};
                    for (let i = 0; i < value; i++) {
                        const key = decode();
                        obj[key] = decode();
                    }
                    return obj;
                
                case 6: // tagged item (ignore tag, return value)
                    return decode();
                
                case 7: // simple/float
                    if (additionalInfo === 20) return false;
                    if (additionalInfo === 21) return true;
                    if (additionalInfo === 22) return null;
                    if (additionalInfo === 23) return undefined;
                    if (additionalInfo === 25) {
                        // float16 - simplified handling
                        offset -= 1;
                        const f16 = (data[offset] << 8) | data[offset + 1];
                        offset += 2;
                        return decodeFloat16(f16);
                    }
                    if (additionalInfo === 26) {
                        // float32
                        offset -= 4;
                        const view = new DataView(data.buffer, offset, 4);
                        offset += 4;
                        return view.getFloat32(0, false);
                    }
                    if (additionalInfo === 27) {
                        // float64
                        const view = new DataView(data.buffer, offset - 8, 8);
                        return view.getFloat64(0, false);
                    }
                    return null;
                
                default:
                    throw new Error('Unknown CBOR major type: ' + majorType);
            }
        }
        
        function readLength(info) {
            if (info < 24) return info;
            if (info === 24) return data[offset++];
            if (info === 25) {
                const val = (data[offset] << 8) | data[offset + 1];
                offset += 2;
                return val;
            }
            if (info === 26) {
                const val = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
                offset += 4;
                return val >>> 0;
            }
            if (info === 27) {
                const high = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
                const low = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
                offset += 8;
                return (high >>> 0) * 0x100000000 + (low >>> 0);
            }
            throw new Error('Invalid CBOR additional info: ' + info);
        }
        
        function decodeFloat16(value) {
            const sign = (value >> 15) & 1;
            const exp = (value >> 10) & 0x1f;
            const mant = value & 0x3ff;
            
            let result;
            if (exp === 0) {
                result = mant * Math.pow(2, -24);
            } else if (exp === 31) {
                result = mant === 0 ? Infinity : NaN;
            } else {
                result = (mant + 1024) * Math.pow(2, exp - 25);
            }
            
            return sign ? -result : result;
        }
        
        return decode();
    }

    function renderCborStats(jsonData) {
        const jsonStr = JSON.stringify(jsonData);
        const jsonSize = new TextEncoder().encode(jsonStr).length;
        const cborSize = currentCborData.length;
        const diff = jsonSize - cborSize;
        const diffPercent = ((diff / jsonSize) * 100).toFixed(1);
        
        const maxSize = Math.max(jsonSize, cborSize);
        const jsonWidth = (jsonSize / maxSize * 100).toFixed(0);
        const cborWidth = (cborSize / maxSize * 100).toFixed(0);
        
        let html = '<div class="size-comparison">';
        
        // JSON bar
        html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">JSON</span>
                    <span class="value">${formatBytes(jsonSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill json" style="width: ${jsonWidth}%"></div>
                </div>
            </div>`;
        
        // CBOR bar
        html += `
            <div class="size-bar-container">
                <div class="size-bar-label">
                    <span class="label">CBOR</span>
                    <span class="value">${formatBytes(cborSize)}</span>
                </div>
                <div class="size-bar">
                    <div class="size-bar-fill cbor" style="width: ${cborWidth}%"></div>
                </div>
            </div>`;
        
        // Difference
        html += `
            <div class="size-diff">
                <div class="diff-value ${diff >= 0 ? 'positive' : 'negative'}">${diff >= 0 ? '-' : '+'}${formatBytes(Math.abs(diff))} (${Math.abs(diffPercent)}%)</div>
                <div class="diff-label">${diff >= 0 ? 'Smaller' : 'Larger'} than JSON</div>
            </div>`;
        
        html += '</div>';
        
        // Additional info
        html += `
            <div class="detail-section">
                <div class="detail-label">Format Details</div>
                <div class="detail-value" style="font-size: 10px;">
                    CBOR (RFC 8949) is designed for small code size and small message size. Used in IoT, WebAuthn, and COSE.
                </div>
            </div>`;
        
        elements.cborInfoContent.innerHTML = html;
    }

    function copyCborHex() {
        if (!currentCborData) {
            showToast('No CBOR data to copy', 'error');
            return;
        }
        
        const hex = Array.from(currentCborData)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
        
        navigator.clipboard.writeText(hex).then(() => {
            showToast('CBOR hex copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    }

    function downloadCbor() {
        if (!currentCborData) {
            showToast('No CBOR data to download', 'error');
            return;
        }
        
        const blob = new Blob([currentCborData], { type: 'application/cbor' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.cbor';
        a.click();
        URL.revokeObjectURL(url);
        showToast('CBOR downloaded', 'success');
    }

    function uploadCbor(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const buffer = e.target.result;
                const decoded = decodeCbor(buffer);
                
                // Update the JSON editor
                elements.editor.value = JSON.stringify(decoded, null, 2);
                handleEditorInput();
                
                // Switch to JSON tab
                switchTab('json');
                showToast('CBOR loaded successfully', 'success');
            } catch (err) {
                showToast('Failed to parse CBOR: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        
        // Reset input
        event.target.value = '';
    }

    // ============ Bookmark ============
    function initBookmark() {
        elements.bookmarkBtn.addEventListener('click', addBookmark);
    }

    function addBookmark() {
        const title = 'JSON-Viewer.Ru — Online JSON Editor';
        const url = window.location.href;
        
        // Try different methods for different browsers
        if (window.sidebar && window.sidebar.addPanel) {
            // Firefox <23
            window.sidebar.addPanel(title, url, '');
        } else if (window.external && ('AddFavorite' in window.external)) {
            // IE
            window.external.AddFavorite(url, title);
        } else {
            // Modern browsers - show instruction
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const shortcut = isMac ? 'Cmd+D' : 'Ctrl+D';
            showToast(`Press ${shortcut} to bookmark this page`, 'success');
        }
    }

    // ============ About Modal ============
    function initAbout() {
        elements.aboutBtn.addEventListener('click', openAbout);
        elements.aboutClose.addEventListener('click', closeAbout);
        elements.aboutModal.addEventListener('click', (e) => {
            if (e.target === elements.aboutModal) {
                closeAbout();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.aboutModal.classList.contains('active')) {
                closeAbout();
            }
        });
    }

    function openAbout() {
        elements.aboutModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeAbout() {
        elements.aboutModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ============ Theme ============
    function initTheme() {
        elements.themeToggle.addEventListener('click', toggleTheme);
        
        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem(THEME_KEY);
        
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // Auto-detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a theme
            if (!localStorage.getItem(THEME_KEY)) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            elements.themeIcon.textContent = 'light_mode';
        } else {
            document.documentElement.removeAttribute('data-theme');
            elements.themeIcon.textContent = 'dark_mode';
        }
    }

    // ============ Utilities ============
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(message, type = 'info') {
        const toast = elements.toast;
        const icon = toast.querySelector('.toast-icon');
        const msg = toast.querySelector('.toast-message');

        toast.className = 'toast ' + type;
        icon.textContent = type === 'success' ? 'check_circle' : 'error';
        msg.textContent = message;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ============ Initialize ============
    function init() {
        initTabs();
        initEditor();
        initTreeViewer();
        initSchema();
        initBson();
        initMsgpack();
        initCbor();
        initBookmark();
        initAbout();
        initTheme();

        // Try to load from localStorage first
        const savedContent = loadFromStorage();
        
        if (savedContent) {
            elements.editor.value = savedContent;
        } else {
            // Sample JSON for demo
            const sampleJson = {
                "name": "JSON Editor",
                "version": "1.0.0",
                "features": ["syntax highlighting", "formatting", "tree view"],
                "settings": {
                    "theme": "light",
                    "autoFormat": true,
                    "tabSize": 2
                },
                "enabled": true,
                "count": 42,
                "nullable": null
            };
            elements.editor.value = JSON.stringify(sampleJson, null, 2);
        }
        
        handleEditorInput();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

