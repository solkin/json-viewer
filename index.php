<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Prevent flash of wrong theme -->
    <script>
    (function() {
        var theme = localStorage.getItem('json-viewer-theme');
        if (!theme) {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    })();
    </script>
    
    <!-- SEO Meta Tags -->
    <title>JSON-Viewer.Ru — Free Online JSON Editor, Formatter, Validator & Converter</title>
    <meta name="description" content="Free online JSON tool: edit JSON with syntax highlighting, format and minify, validate structure, view interactive tree, auto-generate JSON Schema, validate against schema, convert to BSON, MsgPack and CBOR binary formats. Fast, lightweight, no registration required.">
    <meta name="keywords" content="json viewer, json editor, json formatter, json minifier, json validator, json beautifier, json tree view, json schema generator, json schema validator, json to bson, json to msgpack, json to cbor, binary json, online json tool, free json editor, json parser, json structure viewer, json file editor, cbor converter">
    <meta name="author" content="Igor Solkin">
    <link rel="canonical" href="https://json-viewer.ru/">
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    
    <!-- Open Graph / Social Media -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://json-viewer.ru/">
    <meta property="og:title" content="JSON-Viewer.Ru — Online JSON Editor & Converter">
    <meta property="og:description" content="Edit, format, validate JSON. View tree structure, generate and validate JSON Schema, convert to BSON/MsgPack/CBOR. Free online tool for developers.">
    <meta property="og:site_name" content="JSON-Viewer.Ru">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="JSON-Viewer.Ru — Online JSON Editor & Converter">
    <meta name="twitter:description" content="Edit, format, validate JSON. View tree structure, generate and validate JSON Schema, convert to BSON/MsgPack/CBOR.">
    
    <!-- Additional SEO -->
    <meta name="robots" content="index, follow">
    <meta name="language" content="English">
    <meta name="revisit-after" content="7 days">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "JSON-Viewer.Ru",
        "url": "https://json-viewer.ru/",
        "description": "Free online JSON editor with syntax highlighting, formatter, validator, tree viewer, JSON Schema generator and validator, BSON/MsgPack/CBOR converter",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "author": {
            "@type": "Person",
            "name": "Igor Solkin",
            "url": "https://github.com/solkin/json-viewer"
        },
        "featureList": [
            "JSON syntax highlighting editor",
            "JSON formatting and beautification",
            "JSON minification",
            "JSON validation with error highlighting",
            "Interactive JSON tree viewer",
            "JSON Schema auto-generation",
            "JSON Schema validation",
            "JSON to BSON conversion",
            "JSON to MsgPack conversion",
            "JSON to CBOR conversion",
            "File upload and download",
            "Copy to clipboard",
            "Light and dark theme with auto-detection",
            "Auto-save to browser storage"
        ]
    }
    </script>
    
    <!-- Preload critical fonts -->
    <link rel="preload" href="fonts/roboto-400.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="fonts/roboto-500.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="fonts/material-icons.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="fonts.css">
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Hide content until fonts are loaded */
        .fonts-loading { opacity: 0; }
        .fonts-loaded { opacity: 1; transition: opacity 0.1s ease-out; }
    </style>
</head>
<body class="fonts-loading">
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
        (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
        })(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');

        ym(96320345, 'init', {clickmap:true, accurateTrackBounce:true, trackLinks:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/96320345" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->

    <div class="app-container">
        <!-- Header -->
        <header class="app-header">
            <a href="/" class="header-content header-logo">
                <span class="material-icons header-icon">data_object</span>
                <h1>JSON-Viewer.Ru</h1>
            </a>
            <div class="header-links">
                <button class="header-link" id="theme-toggle" title="Toggle dark/light theme">
                    <span class="material-icons" id="theme-icon">dark_mode</span>
                </button>
                <a href="/old/" class="header-link" title="Old version">
                    <span class="material-icons">history</span>
                </a>
                <button class="header-link" id="bookmark-btn" title="Add to bookmarks (Ctrl+D)">
                    <span class="material-icons">bookmark_add</span>
                </button>
                <button class="header-link" id="about-btn" title="About">
                    <span class="material-icons">info</span>
                </button>
                <a href="https://github.com/solkin/json-viewer" target="_blank" rel="noopener" class="header-link" title="GitHub">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
            </div>
        </header>

        <!-- Tabs -->
        <nav class="tabs-container">
            <button class="tab active" data-tab="json">
                <span class="material-icons">code</span>
                JSON
            </button>
            <button class="tab" data-tab="viewer">
                <span class="material-icons">account_tree</span>
                Viewer
            </button>
            <button class="tab" data-tab="schema">
                <span class="material-icons">schema</span>
                Schema
            </button>
            <button class="tab" data-tab="bson">
                <span class="material-icons">memory</span>
                BSON
            </button>
            <button class="tab" data-tab="msgpack">
                <span class="material-icons">all_inbox</span>
                MsgPack
            </button>
            <button class="tab" data-tab="cbor">
                <span class="material-icons">data_array</span>
                CBOR
            </button>
            <div class="tab-indicator"></div>
        </nav>

        <!-- Main Content -->
        <main class="main-content">
            <!-- JSON Editor Tab -->
            <section id="json-tab" class="tab-panel active">
                <div class="toolbar">
                    <button class="btn btn-primary" id="format-btn" title="Format JSON">
                        <span class="material-icons">format_align_left</span>
                        Format
                    </button>
                    <button class="btn btn-secondary" id="minify-btn" title="Minify JSON">
                        <span class="material-icons">compress</span>
                        Minify
                    </button>
                    <button class="btn btn-secondary" id="copy-btn" title="Copy to clipboard">
                        <span class="material-icons">content_copy</span>
                        Copy
                    </button>
                    <button class="btn btn-secondary" id="download-json-btn" title="Download JSON">
                        <span class="material-icons">download</span>
                        Download
                    </button>
                    <label class="btn btn-secondary" title="Load JSON file">
                        <span class="material-icons">upload</span>
                        Load
                        <input type="file" id="upload-json" accept=".json" hidden>
                    </label>
                    <button class="btn btn-danger" id="clear-btn" title="Clear editor">
                        <span class="material-icons">delete_outline</span>
                        Clear
                    </button>
                    <div class="toolbar-spacer"></div>
                    <div class="status-badge" id="status-badge">
                        <span class="material-icons">check_circle</span>
                        <span class="status-text">Valid JSON</span>
                    </div>
                </div>
                <div class="editor-container">
                    <div class="line-numbers" id="line-numbers"></div>
                    <div class="editor-wrapper">
                        <div class="editor-scroll-container" id="editor-scroll">
                            <div class="editor-content">
                                <pre class="syntax-highlight" id="syntax-highlight"></pre>
                                <textarea id="json-editor" spellcheck="false" placeholder="Paste or type your JSON here..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Viewer Tab -->
            <section id="viewer-tab" class="tab-panel">
                <div class="viewer-container">
                    <div class="tree-panel">
                        <div class="panel-header">
                            <span class="material-icons">account_tree</span>
                            <span>Structure</span>
                            <div class="panel-actions">
                                <button class="icon-btn" id="expand-all" title="Expand all">
                                    <span class="material-icons">unfold_more</span>
                                </button>
                                <button class="icon-btn" id="collapse-all" title="Collapse all">
                                    <span class="material-icons">unfold_less</span>
                                </button>
                            </div>
                        </div>
                        <div class="tree-content" id="tree-content">
                            <div class="empty-state">
                                <span class="material-icons">info_outline</span>
                                <p>Enter valid JSON in the editor to view structure</p>
                            </div>
                        </div>
                    </div>
                    <div class="details-panel">
                        <div class="panel-header">
                            <span class="material-icons">info</span>
                            <span>Details</span>
                        </div>
                        <div class="details-content" id="details-content">
                            <div class="empty-state">
                                <span class="material-icons">touch_app</span>
                                <p>Click on any element to view details</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Schema Tab -->
            <section id="schema-tab" class="tab-panel">
                <div class="schema-container">
                    <div class="schema-panel">
                        <div class="panel-header">
                            <span class="material-icons">schema</span>
                            <span>JSON Schema</span>
                            <div class="panel-actions">
                                <button class="icon-btn" id="generate-schema-btn" title="Generate from JSON">
                                    <span class="material-icons">auto_fix_high</span>
                                </button>
                                <label class="icon-btn" title="Load schema file">
                                    <span class="material-icons">upload</span>
                                    <input type="file" id="upload-schema" accept=".json" hidden>
                                </label>
                                <button class="icon-btn" id="copy-schema-btn" title="Copy schema">
                                    <span class="material-icons">content_copy</span>
                                </button>
                                <button class="icon-btn" id="download-schema-btn" title="Download schema">
                                    <span class="material-icons">download</span>
                                </button>
                            </div>
                        </div>
                        <div class="editor-container">
                            <div class="line-numbers" id="schema-line-numbers"></div>
                            <div class="editor-wrapper">
                                <div class="editor-scroll-container" id="schema-editor-scroll">
                                    <div class="editor-content">
                                        <pre class="syntax-highlight" id="schema-syntax-highlight"></pre>
                                        <textarea id="schema-editor" spellcheck="false" placeholder="Generate schema from JSON or paste your own..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="schema-sidebar">
                        <div class="schema-info-panel">
                            <div class="panel-header">
                                <span class="material-icons">fact_check</span>
                                <span>Validation</span>
                                <div class="panel-actions">
                                    <button class="btn btn-primary btn-sm" id="validate-btn" title="Validate JSON against schema">
                                        <span class="material-icons">play_arrow</span>
                                        Validate
                                    </button>
                                </div>
                            </div>
                            <div class="validation-content" id="validation-content">
                                <div class="empty-state">
                                    <span class="material-icons">pending</span>
                                    <p>Click Validate to check JSON</p>
                                </div>
                            </div>
                        </div>
                        <div class="schema-info-panel">
                            <div class="panel-header">
                                <span class="material-icons">analytics</span>
                                <span>Statistics</span>
                            </div>
                            <div class="schema-info-content" id="schema-info-content">
                                <div class="empty-state">
                                    <span class="material-icons">info_outline</span>
                                    <p>Schema statistics will appear here</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- BSON Tab -->
            <section id="bson-tab" class="tab-panel">
                <div class="bson-container">
                    <div class="bson-panel">
                        <div class="panel-header">
                            <span class="material-icons">memory</span>
                            <span>BSON Hex</span>
                            <div class="panel-actions">
                                <button class="icon-btn" id="copy-bson" title="Copy hex">
                                    <span class="material-icons">content_copy</span>
                                </button>
                                <button class="icon-btn" id="download-bson" title="Download BSON">
                                    <span class="material-icons">download</span>
                                </button>
                            </div>
                        </div>
                        <div class="bson-content" id="bson-content">
                            <div class="empty-state">
                                <span class="material-icons">info_outline</span>
                                <p>Enter valid JSON in the editor to generate BSON</p>
                            </div>
                        </div>
                    </div>
                    <div class="bson-info-panel">
                        <div class="panel-header">
                            <span class="material-icons">analytics</span>
                            <span>Size Comparison</span>
                        </div>
                        <div class="bson-info-content" id="bson-info-content">
                            <div class="empty-state">
                                <span class="material-icons">compare_arrows</span>
                                <p>Size statistics will appear here</p>
                            </div>
                        </div>
                        <div class="bson-actions">
                            <label class="btn btn-secondary btn-upload">
                                <span class="material-icons">upload</span>
                                Load BSON
                                <input type="file" id="upload-bson" accept=".bson" hidden>
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            <!-- MsgPack Tab -->
            <section id="msgpack-tab" class="tab-panel">
                <div class="bson-container">
                    <div class="bson-panel">
                        <div class="panel-header">
                            <span class="material-icons">inventory_2</span>
                            <span>MsgPack Hex</span>
                            <div class="panel-actions">
                                <button class="icon-btn" id="copy-msgpack" title="Copy hex">
                                    <span class="material-icons">content_copy</span>
                                </button>
                                <button class="icon-btn" id="download-msgpack" title="Download MsgPack">
                                    <span class="material-icons">download</span>
                                </button>
                            </div>
                        </div>
                        <div class="bson-content" id="msgpack-content">
                            <div class="empty-state">
                                <span class="material-icons">info_outline</span>
                                <p>Enter valid JSON in the editor to generate MsgPack</p>
                            </div>
                        </div>
                    </div>
                    <div class="bson-info-panel">
                        <div class="panel-header">
                            <span class="material-icons">analytics</span>
                            <span>Size Comparison</span>
                        </div>
                        <div class="bson-info-content" id="msgpack-info-content">
                            <div class="empty-state">
                                <span class="material-icons">compare_arrows</span>
                                <p>Size statistics will appear here</p>
                            </div>
                        </div>
                        <div class="bson-actions">
                            <label class="btn btn-secondary btn-upload">
                                <span class="material-icons">upload</span>
                                Load MsgPack
                                <input type="file" id="upload-msgpack" accept=".msgpack,.mp" hidden>
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            <!-- CBOR Tab -->
            <section id="cbor-tab" class="tab-panel">
                <div class="bson-container">
                    <div class="bson-panel">
                        <div class="panel-header">
                            <span class="material-icons">data_array</span>
                            <span>CBOR Hex</span>
                            <div class="panel-actions">
                                <button class="icon-btn" id="copy-cbor" title="Copy hex">
                                    <span class="material-icons">content_copy</span>
                                </button>
                                <button class="icon-btn" id="download-cbor" title="Download CBOR">
                                    <span class="material-icons">download</span>
                                </button>
                            </div>
                        </div>
                        <div class="bson-content" id="cbor-content">
                            <div class="empty-state">
                                <span class="material-icons">info_outline</span>
                                <p>Enter valid JSON in the editor to generate CBOR</p>
                            </div>
                        </div>
                    </div>
                    <div class="bson-info-panel">
                        <div class="panel-header">
                            <span class="material-icons">analytics</span>
                            <span>Size Comparison</span>
                        </div>
                        <div class="bson-info-content" id="cbor-info-content">
                            <div class="empty-state">
                                <span class="material-icons">compare_arrows</span>
                                <p>Size statistics will appear here</p>
                            </div>
                        </div>
                        <div class="bson-actions">
                            <label class="btn btn-secondary btn-upload">
                                <span class="material-icons">upload</span>
                                Load CBOR
                                <input type="file" id="upload-cbor" accept=".cbor" hidden>
                            </label>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <!-- Toast notification -->
    <div class="toast" id="toast">
        <span class="material-icons toast-icon"></span>
        <span class="toast-message"></span>
    </div>

    <!-- About Modal -->
    <div class="modal-overlay" id="about-modal">
        <div class="modal">
            <div class="modal-header">
                <span class="material-icons">data_object</span>
                <h2>JSON-Viewer.Ru</h2>
                <button class="modal-close" id="about-close">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="modal-body">
                <p class="about-description">
                    Free online tool for developers to work with JSON data. Fast, lightweight, no registration required.
                </p>
                
                <div class="about-section">
                    <h3>Features</h3>
                    <ul class="feature-list">
                        <li><span class="material-icons">code</span> JSON editor with syntax highlighting</li>
                        <li><span class="material-icons">format_align_left</span> Format and beautify JSON</li>
                        <li><span class="material-icons">compress</span> Minify JSON</li>
                        <li><span class="material-icons">check_circle</span> Validate JSON structure</li>
                        <li><span class="material-icons">account_tree</span> Interactive tree viewer</li>
                        <li><span class="material-icons">schema</span> Auto-generate JSON Schema</li>
                        <li><span class="material-icons">memory</span> Convert to BSON format</li>
                        <li><span class="material-icons">all_inbox</span> Convert to MsgPack format</li>
                        <li><span class="material-icons">upload</span> Load from file</li>
                        <li><span class="material-icons">download</span> Download results</li>
                        <li><span class="material-icons">dark_mode</span> Light & dark theme with auto-detect</li>
                        <li><span class="material-icons">save</span> Auto-save to browser storage</li>
                    </ul>
                </div>

                <div class="about-section">
                    <h3>Author</h3>
                    <div class="author-card">
                        <div class="author-info">
                            <div class="author-name">Igor Solkin</div>
                            <div class="author-role">Software Developer</div>
                        </div>
                        <div class="author-links">
                            <a href="https://github.com/solkin/json-viewer" target="_blank" rel="noopener" class="btn btn-secondary">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                                <span>GitHub</span>
                            </a>
                            <a href="mailto:i.solkin@gmail.com" class="btn btn-secondary">
                                <span class="material-icons">email</span>
                                <span>Email</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="about-footer">
                    <span>© <?php echo date('Y'); ?> JSON-Viewer.Ru</span>
                    <span>•</span>
                    <span>Made with ❤️ for developers</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Show content when fonts are ready
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() {
                document.body.classList.remove('fonts-loading');
                document.body.classList.add('fonts-loaded');
            });
        } else {
            // Fallback for older browsers
            document.body.classList.remove('fonts-loading');
            document.body.classList.add('fonts-loaded');
        }
    </script>
    <script src="app.js"></script>
</body>
</html>

