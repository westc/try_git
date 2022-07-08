/**
 * Copyright (c) 2022 Christopher West
 * https://www.yourjs.com/
 *
 * Licensed under the MIT License:
 * https://opensource.org/licenses/MIT
 * 
 * Usage - Includes all of the CSS and JS files from https://gist.github.com/0123456789abcdef0123456789abcdef.
 * <script src="include-gist-code.js?gist=2fe0bfa42237139860f32972ddc608f1"></script>
 * 
 * Usage - Includes "example.js" from https://gist.github.com/0123456789abcdef0123456789abcdef as a JS file:
 * <script src="include-gist-code.js?gist=0123456789abcdef0123456789abcdef&file=example.js"></script>
 * 
 * Usage - Includes "example.css" from https://gist.github.com/0123456789abcdef0123456789abcdef as a CSS file:
 * <script src="include-gist-code.js?gist=0123456789abcdef0123456789abcdef&file=example.css"></script>
 * 
 * Usage - Includes "example-css.txt" from https://gist.github.com/0123456789abcdef0123456789abcdef as a CSS file:
 * <script src="include-gist-code.js?gist=0123456789abcdef0123456789abcdef&file=example-css.txt#css"></script>
 * 
 * Usage - Includes "example.js" followed by "example-2.js" from https://gist.github.com/0123456789abcdef0123456789abcdef as a JS files:
 * <script src="include-gist-code.js?gist=0123456789abcdef0123456789abcdef&file=example.js&file=example-2.js"></script>
 */
(function(document, encodeURIComponent) {
  const {currentScript} = document;
  const {parentNode} = currentScript;
  const scriptUrl = currentScript.src;

  // Parse this script's URL to extract the Gist ID and the optional file
  // name(s).
  let gistId, chosenFileNames = [];
  scriptUrl.replace(/#[^]*/, '').replace(
    /[&?]([^&=]+)=([^&]+)/g,
    (_, key, value) => {
      value = decodeURIComponent(value.replace(/\+/g, ' '));
      if (key === 'gist') {
        gistId = value;
      }
      else if (key === 'file') {
        chosenFileNames.push(value);
      }
    }
  );

  // Throw an error if no Gist ID was found via this script's "gist" URL
  // parameter.
  if (!gistId) {
    const exampleURL = scriptUrl.replace(/[?#][^]*|$/, '?gist=2fe0bfa42237139860f32972ddc608f1&file=readGist.js');
    throw new Error("You must include the GitHub Gist in the script's URL (eg. " + JSON.stringify(exampleURL) + ").");
  }

  // Create a temporary callback function that will be called by the JSON-P Gist
  // script that will be added to the page shortly.
  const callbackName = ('__includeGist' + (Math.random() + Math.random())).replace('.', '');
  window[callbackName] = function(gistData) {
    // Remove this temporary callback function from the global namespace.
    delete window[callbackName];
    
    // Get all of the file names as reported by GitHub.
    const allFileNames = gistData.files;

    // If no files were specified automatically include all of the files that
    // end in ".css" or ".js".
    if (!chosenFileNames.length) {
      chosenFileNames = allFileNames.filter(f => /[#\.]js$|[#\.]css$/i.test(f));
      if (!chosenFileNames.length) {
        throw new Error('No includable Gist code was found.');
      }
    }

    // Gets all of the .gist-data elements while making sure any <template> tags
    // are converted to <div> tags for ease of traversing the DOM tree.
    const divs = Object.assign(document.createElement('div'), {
      innerHTML: gistData.div.replace(/(<\/?\s*)template(?=\s|>)/g, '$1div')
    }).querySelectorAll('.gist-file > .gist-data');

    // Used to keep the ordering of the scripts just in case that is important
    // for the developer.
    let lastScript;

    // Loops through all of the chosen file names and if they are files in the
    // gist they are added to the page as scripts using data URLs.
    chosenFileNames.forEach(chosenFileName => {
      const index = allFileNames.indexOf(chosenFileName.replace(/#[^]+$/));
      if (index >= 0) {
        const lineElems = divs[index].querySelectorAll('[class*="file-line "], [class$="file-line"]');
        const code = Array.from(lineElems).map(tr => tr.textContent.replace(/\s+$/g, '')).join('\n');
        const newScript = /[#\.]css$/i.test(chosenFileName)
          ? Object.assign(document.createElement('link'), {
              href: 'data:text/css;charset=UTF-8,' + encodeURIComponent(code),
              rel: 'stylesheet',
            })
          : Object.assign(document.createElement('script'), {
              src: 'data:text/javascript;charset=UTF-8,' + encodeURIComponent(code),
            });
        newScript.setAttribute('data-gist-id', gistId);
        newScript.setAttribute('data-gist-file', chosenFileName);
        parentNode.insertBefore(
          newScript,
          (lastScript || currentScript).nextSibling
        );
        lastScript = newScript;
      }
      else {
        // Throw an error if the file wasn't found but throw it asynchronously
        // to make it possible to continue and throw multiple errors if
        // necessary.
        setTimeout(() => {throw new Error('There was no ' + JSON.stringify(chosenFileName) + ' found in this Gist.');});
      }
    });
  };

  // Temporarily add the GitHub JSON-P script to the DOM directly after the
  // current script.
  const jsonpScript = Object.assign(document.createElement('script'), {
    src: 'https://gist.github.com/' + gistId + '.json?callback=' + callbackName,
    onload() { jsonpScript.parentNode.removeChild(jsonpScript); },
  });
  parentNode.insertBefore(jsonpScript, currentScript.nextSibling);
})(document, encodeURIComponent);
