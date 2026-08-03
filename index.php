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
    <meta name="description" content="Free online JSON tool: edit JSON with syntax highlighting, format and minify, validate structure, view interactive tree, compare two JSON documents semantically, convert JSON to YAML and YAML to JSON, auto-generate JSON Schema, validate against schema, convert to BSON, MsgPack and CBOR binary formats. Fast, lightweight, no registration required.">
    <meta name="keywords" content="json viewer, json editor, json formatter, json minifier, json validator, json beautifier, json tree view, json compare, json diff, json to yaml, yaml to json, yaml converter, json schema generator, json schema validator, json to bson, json to msgpack, json to cbor, binary json, online json tool, free json editor, json parser, json structure viewer, json file editor, cbor converter">
    <meta name="author" content="Igor Solkin">
    <link rel="canonical" href="https://json-viewer.ru/">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="favicon.svg">

    <!-- Open Graph / Social Media -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://json-viewer.ru/">
    <meta property="og:title" content="JSON-Viewer.Ru — Online JSON Editor & Converter">
    <meta property="og:description" content="Edit, format, validate JSON. View tree structure, convert JSON to/from YAML, generate and validate JSON Schema, convert to BSON/MsgPack/CBOR. Free online tool for developers.">
    <meta property="og:site_name" content="JSON-Viewer.Ru">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="JSON-Viewer.Ru — Online JSON Editor & Converter">
    <meta name="twitter:description" content="Edit, format, validate JSON. View tree structure, convert JSON to/from YAML, generate and validate JSON Schema, convert to BSON/MsgPack/CBOR.">

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
        "description": "Free online JSON editor with syntax highlighting, formatter, validator, tree viewer, JSON/YAML converter, JSON Schema generator and validator, BSON/MsgPack/CBOR converter",
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
            "Semantic JSON comparison and diff report",
            "JSON to YAML and YAML to JSON conversion",
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

    <div class="app">
        <!-- ============ App bar ============ -->
        <header class="appbar">
            <a href="/" class="brand">
                <span class="material-icons brand-mark">data_object</span>
                <span class="brand-name">JSON-Viewer<span class="brand-tld">.Ru</span></span>
            </a>
            <div class="appbar-spacer"></div>
            <div class="appbar-actions">
                <button class="ghost-btn" id="theme-toggle" title="Toggle dark / light theme">
                    <span class="material-icons" id="theme-icon">dark_mode</span>
                </button>
                <a href="/old/" class="ghost-btn" title="Old version">
                    <span class="material-icons">history</span>
                </a>
                <button class="ghost-btn" id="bookmark-btn" title="Add to bookmarks (Ctrl+D)">
                    <span class="material-icons">bookmark_add</span>
                </button>
                <button class="ghost-btn" id="about-btn" title="About &amp; keyboard shortcuts">
                    <span class="material-icons">info</span>
                </button>
                <a href="https://github.com/solkin/json-viewer" target="_blank" rel="noopener" class="ghost-btn" title="GitHub">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
            </div>
        </header>

        <div class="app-body">
            <!-- ============ Mode rail ============ -->
            <nav class="rail" id="rail" aria-label="Workspace">
                <button class="rail-btn active" data-mode="read" title="Read &amp; explore the document (Alt+1)">
                    <span class="material-icons">account_tree</span>
                    <span class="rail-label">Read</span>
                </button>
                <button class="rail-btn" data-mode="validate" title="Schema &amp; validation (Alt+2)">
                    <span class="material-icons">verified</span>
                    <span class="rail-label">Validate</span>
                </button>
                <button class="rail-btn" data-mode="convert" title="Convert to another format (Alt+3)">
                    <span class="material-icons">sync_alt</span>
                    <span class="rail-label">Convert</span>
                </button>
                <button class="rail-btn" data-mode="compare" title="Compare two documents (Alt+4)">
                    <span class="material-icons">difference</span>
                    <span class="rail-label">Compare</span>
                </button>
            </nav>

            <!-- ============ Workspace ============ -->
            <main class="workspace">
                <!-- Command bar: document actions (read / validate / convert) -->
                <div class="cmdbar" id="cmdbar-doc">
                    <button class="btn btn-primary" id="format-btn" title="Pretty-print the document (Ctrl+Shift+F)">
                        <span class="material-icons">format_align_left</span>
                        Format
                    </button>
                    <button class="btn" id="minify-btn" title="Strip all whitespace">
                        <span class="material-icons">compress</span>
                        Minify
                    </button>
                    <span class="cmd-sep"></span>
                    <label class="btn" title="Open a .json file">
                        <span class="material-icons">folder_open</span>
                        Open
                        <input type="file" id="upload-json" accept=".json,.txt,application/json" hidden>
                    </label>
                    <button class="btn" id="download-json-btn" title="Download as data.json">
                        <span class="material-icons">download</span>
                        Save
                    </button>
                    <button class="btn" id="copy-btn" title="Copy the document to clipboard">
                        <span class="material-icons">content_copy</span>
                        Copy
                    </button>
                    <span class="cmd-sep"></span>
                    <button class="btn btn-danger" id="clear-btn" title="Clear the document">
                        <span class="material-icons">delete_outline</span>
                        Clear
                    </button>
                    <span class="cmd-spacer"></span>
                    <span class="cmd-hint" id="cmd-hint">Autosaved to this browser</span>
                </div>

                <!-- Command bar: compare -->
                <div class="cmdbar" id="cmdbar-compare" hidden>
                    <button class="btn btn-primary" id="compare-run-btn" title="Run the semantic diff">
                        <span class="material-icons">play_arrow</span>
                        Compare
                    </button>
                    <button class="btn" id="compare-swap-btn" title="Swap A and B">
                        <span class="material-icons">swap_horiz</span>
                        Swap
                    </button>
                    <span class="cmd-sep"></span>
                    <button class="btn" id="compare-from-editor-a-btn" title="Copy the working document into A">
                        <span class="material-icons">login</span>
                        Document &rarr; A
                    </button>
                    <button class="btn" id="compare-from-editor-b-btn" title="Copy the working document into B">
                        <span class="material-icons">login</span>
                        Document &rarr; B
                    </button>
                    <span class="cmd-sep"></span>
                    <button class="btn" id="compare-copy-report-btn" title="Copy the diff as plain text">
                        <span class="material-icons">content_copy</span>
                        Copy report
                    </button>
                    <span class="cmd-spacer"></span>
                    <span class="cmd-hint">Semantic &middot; key order ignored &middot; arrays by index</span>
                </div>

                <!-- ============ Stage: document modes ============ -->
                <div class="stage" id="stage-doc">
                    <!-- Source pane (shared by read / validate / convert) -->
                    <section class="pane pane-source" id="pane-source">
                        <div class="pane-head">
                            <span class="material-icons pane-icon">data_object</span>
                            <span class="pane-title">Source</span>
                            <span class="tag" id="source-tag">JSON</span>
                            <div class="pane-tools">
                                <button class="icon-btn" id="source-wrap-btn" title="Toggle word wrap">
                                    <span class="material-icons">wrap_text</span>
                                </button>
                            </div>
                        </div>
                        <div class="editor-container">
                            <div class="line-numbers" id="line-numbers"></div>
                            <div class="editor-wrapper">
                                <div class="editor-scroll-container" id="editor-scroll">
                                    <div class="editor-content">
                                        <pre class="syntax-highlight" id="syntax-highlight"></pre>
                                        <textarea id="json-editor" spellcheck="false" placeholder="Paste or type JSON here…"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div class="splitter splitter-col" id="splitter-doc" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize"></div>

                    <!-- Auxiliary pane -->
                    <section class="pane pane-aux" id="pane-aux">
                        <!-- ---- READ ---- -->
                        <div class="aux" id="aux-read">
                            <div class="pane-head">
                                <span class="material-icons pane-icon">account_tree</span>
                                <span class="pane-title">Structure</span>
                                <div class="pane-tools">
                                    <button class="icon-btn" id="expand-all" title="Expand all">
                                        <span class="material-icons">unfold_more</span>
                                    </button>
                                    <button class="icon-btn" id="collapse-all" title="Collapse all">
                                        <span class="material-icons">unfold_less</span>
                                    </button>
                                </div>
                            </div>
                            <div class="aux-body tree-content" id="tree-content">
                                <div class="empty-state">
                                    <span class="material-icons">account_tree</span>
                                    <p>Type valid JSON on the left to explore its structure</p>
                                </div>
                            </div>
                            <div class="drawer" id="drawer-read">
                                <button class="drawer-head" data-drawer="drawer-read">
                                    <span class="material-icons drawer-chevron">expand_more</span>
                                    <span class="pane-title">Details</span>
                                </button>
                                <div class="drawer-body details-content" id="details-content">
                                    <div class="empty-state">
                                        <span class="material-icons">touch_app</span>
                                        <p>Select a node to inspect it</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ---- VALIDATE ---- -->
                        <div class="aux" id="aux-validate" hidden>
                            <div class="pane-head">
                                <span class="material-icons pane-icon">schema</span>
                                <span class="pane-title">JSON Schema</span>
                                <div class="pane-tools">
                                    <button class="icon-btn" id="generate-schema-btn" title="Generate schema from the document">
                                        <span class="material-icons">auto_fix_high</span>
                                    </button>
                                    <label class="icon-btn" title="Load a schema file">
                                        <span class="material-icons">upload</span>
                                        <input type="file" id="upload-schema" accept=".json" hidden>
                                    </label>
                                    <button class="icon-btn" id="copy-schema-btn" title="Copy schema">
                                        <span class="material-icons">content_copy</span>
                                    </button>
                                    <button class="icon-btn" id="download-schema-btn" title="Download schema">
                                        <span class="material-icons">download</span>
                                    </button>
                                    <button class="btn btn-primary btn-sm" id="validate-btn" title="Validate the document against this schema">
                                        <span class="material-icons">play_arrow</span>
                                        Validate
                                    </button>
                                </div>
                            </div>
                            <div class="aux-body aux-body-flush">
                                <div class="editor-container">
                                    <div class="line-numbers" id="schema-line-numbers"></div>
                                    <div class="editor-wrapper">
                                        <div class="editor-scroll-container" id="schema-editor-scroll">
                                            <div class="editor-content">
                                                <pre class="syntax-highlight" id="schema-syntax-highlight"></pre>
                                                <textarea id="schema-editor" spellcheck="false" placeholder="Generate a schema from the document, or paste your own…"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="drawer collapsed" id="drawer-validate">
                                <button class="drawer-head" data-drawer="drawer-validate">
                                    <span class="material-icons drawer-chevron">expand_more</span>
                                    <span class="pane-title">Report</span>
                                </button>
                                <div class="drawer-body">
                                    <div class="validation-content" id="validation-content">
                                        <div class="empty-state">
                                            <span class="material-icons">pending</span>
                                            <p>Run Validate to check the document</p>
                                        </div>
                                    </div>
                                    <div class="section-label">Schema statistics</div>
                                    <div class="schema-info-content" id="schema-info-content">
                                        <div class="empty-state">
                                            <span class="material-icons">analytics</span>
                                            <p>Statistics appear once a schema exists</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ---- CONVERT ---- -->
                        <div class="aux" id="aux-convert" hidden>
                            <div class="pane-head">
                                <div class="segmented" id="format-switch" role="tablist">
                                    <button class="seg active" data-format="yaml" role="tab">YAML</button>
                                    <button class="seg" data-format="bson" role="tab">BSON</button>
                                    <button class="seg" data-format="msgpack" role="tab">MsgPack</button>
                                    <button class="seg" data-format="cbor" role="tab">CBOR</button>
                                </div>
                                <div class="pane-tools">
                                    <div class="tool-group" data-format="yaml">
                                        <label class="icon-btn" title="Load a YAML file">
                                            <span class="material-icons">upload</span>
                                            <input type="file" id="upload-yaml" accept=".yaml,.yml,.txt,text/yaml" hidden>
                                        </label>
                                        <button class="icon-btn" id="yaml-copy-btn" title="Copy YAML">
                                            <span class="material-icons">content_copy</span>
                                        </button>
                                        <button class="icon-btn" id="yaml-download-btn" title="Download YAML">
                                            <span class="material-icons">download</span>
                                        </button>
                                    </div>
                                    <div class="tool-group" data-format="bson" hidden>
                                        <label class="icon-btn" title="Load a BSON file">
                                            <span class="material-icons">upload</span>
                                            <input type="file" id="upload-bson" accept=".bson" hidden>
                                        </label>
                                        <button class="icon-btn" id="copy-bson" title="Copy hex">
                                            <span class="material-icons">content_copy</span>
                                        </button>
                                        <button class="icon-btn" id="download-bson" title="Download BSON">
                                            <span class="material-icons">download</span>
                                        </button>
                                    </div>
                                    <div class="tool-group" data-format="msgpack" hidden>
                                        <label class="icon-btn" title="Load a MsgPack file">
                                            <span class="material-icons">upload</span>
                                            <input type="file" id="upload-msgpack" accept=".msgpack,.mp" hidden>
                                        </label>
                                        <button class="icon-btn" id="copy-msgpack" title="Copy hex">
                                            <span class="material-icons">content_copy</span>
                                        </button>
                                        <button class="icon-btn" id="download-msgpack" title="Download MsgPack">
                                            <span class="material-icons">download</span>
                                        </button>
                                    </div>
                                    <div class="tool-group" data-format="cbor" hidden>
                                        <label class="icon-btn" title="Load a CBOR file">
                                            <span class="material-icons">upload</span>
                                            <input type="file" id="upload-cbor" accept=".cbor" hidden>
                                        </label>
                                        <button class="icon-btn" id="copy-cbor" title="Copy hex">
                                            <span class="material-icons">content_copy</span>
                                        </button>
                                        <button class="icon-btn" id="download-cbor" title="Download CBOR">
                                            <span class="material-icons">download</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="aux-body aux-body-flush">
                                <div class="conv" data-format="yaml">
                                    <div class="editor-container">
                                        <div class="line-numbers" id="yaml-yaml-line-numbers"></div>
                                        <div class="editor-wrapper">
                                            <div class="editor-scroll-container" id="yaml-yaml-scroll">
                                                <div class="editor-content">
                                                    <pre class="syntax-highlight" id="yaml-yaml-syntax"></pre>
                                                    <textarea id="yaml-yaml-editor" spellcheck="false" placeholder="YAML appears here — edit it and the document updates"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="parse-error" id="yaml-error-yaml" hidden></div>
                                </div>
                                <div class="conv" data-format="bson" hidden>
                                    <div class="hex-content" id="bson-content">
                                        <div class="empty-state">
                                            <span class="material-icons">memory</span>
                                            <p>Valid JSON on the left is encoded to BSON here</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="conv" data-format="msgpack" hidden>
                                    <div class="hex-content" id="msgpack-content">
                                        <div class="empty-state">
                                            <span class="material-icons">inventory_2</span>
                                            <p>Valid JSON on the left is encoded to MsgPack here</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="conv" data-format="cbor" hidden>
                                    <div class="hex-content" id="cbor-content">
                                        <div class="empty-state">
                                            <span class="material-icons">data_array</span>
                                            <p>Valid JSON on the left is encoded to CBOR here</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="drawer" id="drawer-convert">
                                <button class="drawer-head" data-drawer="drawer-convert">
                                    <span class="material-icons drawer-chevron">expand_more</span>
                                    <span class="pane-title">Size comparison</span>
                                </button>
                                <div class="drawer-body">
                                    <div class="conv-info" data-format="yaml" id="yaml-info-content"></div>
                                    <div class="conv-info" data-format="bson" id="bson-info-content" hidden></div>
                                    <div class="conv-info" data-format="msgpack" id="msgpack-info-content" hidden></div>
                                    <div class="conv-info" data-format="cbor" id="cbor-info-content" hidden></div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- ============ Stage: compare ============ -->
                <div class="stage stage-compare" id="stage-compare" hidden>
                    <div class="compare-row" id="compare-row">
                        <section class="pane">
                            <div class="pane-head">
                                <span class="tag tag-a">A</span>
                                <span class="pane-title">Document A</span>
                                <div class="pane-tools">
                                    <label class="icon-btn" title="Load a JSON file into A">
                                        <span class="material-icons">upload</span>
                                        <input type="file" id="upload-compare-a" accept=".json,.txt,application/json" hidden>
                                    </label>
                                </div>
                            </div>
                            <div class="editor-container">
                                <div class="line-numbers" id="compare-a-line-numbers"></div>
                                <div class="editor-wrapper">
                                    <div class="editor-scroll-container" id="compare-a-scroll">
                                        <div class="editor-content">
                                            <pre class="syntax-highlight" id="compare-a-syntax"></pre>
                                            <textarea id="compare-json-a" spellcheck="false" placeholder="Paste or load JSON A…"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="parse-error" id="compare-error-a" hidden></div>
                        </section>
                        <div class="splitter splitter-col" id="splitter-cmp" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize"></div>
                        <section class="pane">
                            <div class="pane-head">
                                <span class="tag tag-b">B</span>
                                <span class="pane-title">Document B</span>
                                <div class="pane-tools">
                                    <label class="icon-btn" title="Load a JSON file into B">
                                        <span class="material-icons">upload</span>
                                        <input type="file" id="upload-compare-b" accept=".json,.txt,application/json" hidden>
                                    </label>
                                </div>
                            </div>
                            <div class="editor-container">
                                <div class="line-numbers" id="compare-b-line-numbers"></div>
                                <div class="editor-wrapper">
                                    <div class="editor-scroll-container" id="compare-b-scroll">
                                        <div class="editor-content">
                                            <pre class="syntax-highlight" id="compare-b-syntax"></pre>
                                            <textarea id="compare-json-b" spellcheck="false" placeholder="Paste or load JSON B…"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="parse-error" id="compare-error-b" hidden></div>
                        </section>
                    </div>
                    <div class="splitter splitter-row" id="splitter-diff" role="separator" aria-orientation="horizontal" tabindex="0" title="Drag to resize"></div>
                    <section class="pane pane-diff" id="pane-diff">
                        <div class="pane-head">
                            <span class="material-icons pane-icon">difference</span>
                            <span class="pane-title">Diff</span>
                        </div>
                        <div class="aux-body" id="compare-results-content">
                            <div class="empty-state">
                                <span class="material-icons">difference</span>
                                <p>Fill both panels and run Compare</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>

        <!-- ============ Status bar ============ -->
        <footer class="statusbar">
            <span class="status-badge" id="status-badge">
                <span class="material-icons">check_circle</span>
                <span class="status-text">Valid JSON</span>
            </span>
            <span class="sb-item" id="sb-cursor">Ln 1, Col 1</span>
            <span class="sb-item" id="sb-lines">0 lines</span>
            <span class="sb-item" id="sb-size">0 B</span>
            <span class="sb-item" id="sb-nodes">0 nodes</span>
            <span class="sb-spacer"></span>
            <span class="sb-item sb-error" id="sb-error" hidden></span>
            <span class="sb-item" id="sb-mode">Read</span>
        </footer>
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
                    <h3>Workspace</h3>
                    <ul class="mode-list">
                        <li>
                            <span class="material-icons">account_tree</span>
                            <div>
                                <strong>Read</strong>
                                <span>Source next to an interactive tree, with per-node details</span>
                            </div>
                        </li>
                        <li>
                            <span class="material-icons">verified</span>
                            <div>
                                <strong>Validate</strong>
                                <span>Auto-generate a JSON Schema and validate the document against it</span>
                            </div>
                        </li>
                        <li>
                            <span class="material-icons">sync_alt</span>
                            <div>
                                <strong>Convert</strong>
                                <span>YAML both ways, plus BSON, MsgPack and CBOR with size comparison</span>
                            </div>
                        </li>
                        <li>
                            <span class="material-icons">difference</span>
                            <div>
                                <strong>Compare</strong>
                                <span>Semantic diff of two documents — key order ignored, arrays by index</span>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="about-section">
                    <h3>Keyboard</h3>
                    <ul class="shortcut-list">
                        <li><kbd>Alt</kbd><kbd>1</kbd>&hellip;<kbd>4</kbd><span>Switch workspace mode</span></li>
                        <li><kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>F</kbd><span>Format the document</span></li>
                        <li><kbd>Tab</kbd><span>Insert two spaces in any editor</span></li>
                        <li><kbd>Esc</kbd><span>Close this dialog</span></li>
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
                            <a href="https://github.com/solkin/json-viewer" target="_blank" rel="noopener" class="btn">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                                <span>GitHub</span>
                            </a>
                            <a href="mailto:i.solkin@gmail.com" class="btn">
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
