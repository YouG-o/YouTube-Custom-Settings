/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */


// Function to wait for an element to be present in the DOM
export function waitForElement(selector: string, timeout = 7500): Promise<Element> {
    return new Promise((resolve, reject) => {
        const existingElement = document.querySelector(selector);
        if (existingElement) {
            return resolve(existingElement);
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (element.matches(selector)) {
                                observer.disconnect();
                                clearTimeout(timer);
                                resolve(element);
                                return;
                            }
                            const descendant = element.querySelector(selector);
                            if (descendant) {
                                observer.disconnect();
                                clearTimeout(timer);
                                resolve(descendant);
                                return;
                            }
                        }
                    }
                }
            }
        });

        const timer = setTimeout(() => {
            observer.disconnect();
            reject(new Error('Timeout waiting for element: ' + selector));
        }, timeout);

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}