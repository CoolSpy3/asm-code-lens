import * as vscode from 'vscode';
import * as path from 'path';
import {readFileSync} from 'fs';
import {PackageInfo} from './whatsnew/packageinfo';


export class HexCalcProvider implements vscode.WebviewViewProvider {
	// The webview is stored here.
	protected webview: vscode.Webview;


	/**
	 * Called by vscode.
	 */
	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		// Store webview
		this.webview = webviewView.webview;

		// Allow scripts in the webview
		this.webview.options = {
			enableScripts: true
		};

		// Handle messages from the webview
		this.webview.onDidReceiveMessage(message => {
			switch (message.command) {	// NOSONAR
				case 'donateClicked':
					this.openDonateWebView();
					break;
			}
		});

		// Create html code
		this.setMainHtml();
	}


	/**
	 * Returns the html code to display the calculator.
	 */
	public setMainHtml() {
		if (!this.webview)
			return;

		// Add the html styles etc.
		const extPath = PackageInfo.extension.extensionPath;
		const mainHtmlFile = path.join(extPath, 'html', 'hexcalc.html');
		let mainHtml = readFileSync(mainHtmlFile).toString();
		// Exchange local path
		const resourcePath = vscode.Uri.file(extPath);
		const vscodeResPath = this.webview.asWebviewUri(resourcePath).toString();
		mainHtml = mainHtml.replace(/\${vscodeResPath}/g, vscodeResPath);

		// Get hex prefix
		const configuration = PackageInfo.getConfiguration();
		const hexPrefix = configuration.get<string>('hexCalculator.hexPrefix');
		// Add to initialization
		mainHtml = mainHtml.replace('//${init}', `
let hexPrefix = "${hexPrefix}";`
		);

		// Get donated state
		const donated = configuration.get<boolean>('donated');
		// Set button
		if (!donated) {
			mainHtml = mainHtml.replace('<!--${donate}-->', `
		<button class="button-donate" style="float:right" onclick="donateClicked()">Donate...<div style="float:right;font-size:50%">ASM Code Lens</div></button>`);
		}

		// Add a Reload and Copy button for debugging
		//mainHtml = mainHtml.replace('<body>', '<body><button onclick="parseStart()">Reload</button><button onclick="copyHtmlToClipboard()">Copy HTML to clipboard</button>');

		// Set content
		this.webview.html = mainHtml;
	}


	/**
	 * Opens a webview with donation information.
	 */
	protected openDonateWebView() {
		// Create vscode panel view
		const vscodePanel = vscode.window.createWebviewPanel('', '', {preserveFocus: true, viewColumn: vscode.ViewColumn.Nine});
		vscodePanel.title = 'Donate...';
		// Read the file
		const extPath = PackageInfo.extension.extensionPath;
		const htmlFile = path.join(extPath, 'html/donate.html');
		let html = readFileSync(htmlFile).toString();
		// Exchange local path
		const resourcePath = vscode.Uri.file(extPath);
		const vscodeResPath = vscodePanel.webview.asWebviewUri(resourcePath).toString();
		html = html.replace('${vscodeResPath}', vscodeResPath);

		// Handle messages from the webview
		vscodePanel.webview.options = {enableScripts: true};
		vscodePanel.webview.onDidReceiveMessage(message => {
			switch (message.command) {	// NOSONAR
				case 'showExtension':
					// Switch to Extension Manager
					vscode.commands.executeCommand("workbench.extensions.search", PackageInfo.extension.packageJSON.publisher)
					// And select the given extension
					const extensionName = PackageInfo.extension.packageJSON.publisher + '.' + message.data;
					vscode.commands.executeCommand("extension.open", extensionName);
					break;
			}
		});

		// Set html
		vscodePanel.webview.html = html;
	}

}
