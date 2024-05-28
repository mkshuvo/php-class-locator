const vscode = require('vscode');
const path = require('path');
const { exec } = require('child_process');

function searchFiles(fullPath, projectRoot, fileName) {
    return new Promise((resolve, reject) => {
        const command = `find ${projectRoot} -type f -name "${fileName}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            if (stderr) {
                reject(stderr);
                return;
            }

            const results = stdout.split('\n').filter(line => line.trim() !== '');

            const formattedFullPath = fullPath.replace(/\\/g, '/');
            const searchPath = `${formattedFullPath}.php`;

            const matchingResults = results.filter(result => {
                return result.trim().endsWith(searchPath);
            });

            resolve(matchingResults);
        });
    });
}



function activate(context) {
    console.log('PHP Class Locator extension is now active!');

    let disposable = vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'php' }, {
        // @ts-ignore
        async provideDefinition(document, position, token) {
            console.log('provideDefinition called');

            if (
                (process.platform === 'win32' && vscode.window.activeTextEditor?.selection.isSingleLine) ||  // Windows: Ctrl + Click
                (process.platform === 'darwin' && vscode.window.activeTextEditor?.selection.isEmpty)      // macOS: Cmd + Click
            ) {

                const range = document.getWordRangeAtPosition(position, /(['"])([^'"]+)\1/);
                if (!range) {
                    console.log('No range found at the position');
                    return null;
                }

                const text = document.getText(range);
                console.log('Text found:', text);

                const match = text.match(/['"]([^'"]+)['"]/);
                if (!match) {
                    console.log('No match found in the text');
                    return null;
                }

                const fullPath = match[1];
                const className = fullPath.split('\\').pop();
                console.log('Class name found:', className);

                if (!className) {
                    console.log('Class name is empty');
                    return null;
                }

                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) {
                    console.log('No workspace folders found');
                    return null;
                }

                const projectRoot = workspaceFolders[0].uri.fsPath;
                const fileName = `${className}.php`;
                const searchPattern = path.join(projectRoot, '**', `${className}.php`);
                console.log('Search pattern:', searchPattern);

                try {
                    const files = await searchFiles(fullPath, projectRoot, fileName);
                    console.log('Files found:', files);

                    if (files.length > 0) {
                        const fileUri = vscode.Uri.file(files[0]);
                        console.log('File found:', fileUri.fsPath);
                        const document = await vscode.workspace.openTextDocument(fileUri);
                        console.log('Document opened successfully');
                        return vscode.window.showTextDocument(document);
                    } else {
                        console.log('No files found for the search pattern');
                        return null;
                    }
                } catch (err) {
                    console.error('Error finding or opening file:', err);
                    return null;
                }
            }
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {
    console.log('PHP Class Locator extension is now deactivated');
}

module.exports = {
    activate,
    deactivate
};
