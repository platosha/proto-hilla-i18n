import { UserConfigFn } from 'vite';
import { overrideVaadinConfig } from './vite.generated';
import MagicString from 'magic-string';
import transformAst from 'transform-ast';

import * as path from 'node:path';
import * as fs from 'node:fs';

const dir = path.dirname(new URL(import.meta.url).pathname);

const i18nOutputDir = path.resolve(dir, 'target/classes/META-INF/VAADIN/i18n');

const i18nSourceDir = path.resolve(dir, 'src/main/resources/vaadin-i18n');
const i18nTargetDir = path.resolve(dir, 'target/classes/vaadin-i18n');

const chunkNameMarker = '__VAADIN_I18n_chunkName__';

function isSourceModule(id: string) {
    if (!/\.[jt]sx?/.test(id)) {
        return false;
    }
    const relative = path.relative(dir, id);
    if (!relative.startsWith('src/main/frontend/') || relative.startsWith('src/main/frontend/generated/')) {
        return false;
    }

    return true;
}

const chunkKeySet = new Map<string, Set<string>>();

const customConfig: UserConfigFn = (env) => ({
  // Here you can add custom Vite parameters
  // https://vitejs.dev/config/
    plugins: [
        {
            name: 'vaadin:i18n',
            async transform(code, id) {
                if (!isSourceModule(id)) {
                    return;
                }
                const info = this.getModuleInfo(id);
                const ast = this.parse(code);
                const translateBindings = new Set<string>();
                const keySet = new Set<string>();
                const magicString = transformAst(code, {ast}, (node: any) => {
                    if (node.type === 'ImportDeclaration' && node.source?.value === '@vaadin/hilla-react-i18n') {
                        for (const spec of node?.specifiers) {
                            if (spec.imported?.name === 'translate') {
                                translateBindings.add(spec.local?.name);
                            }
                        }
                    }
                    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && translateBindings.has(node.callee.name) && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {
                        keySet.add(node.arguments[0].value);
                    }
                });
                if (keySet.size > 0) {
                    magicString.prepend(`import { i18n } from '@vaadin/hilla-react-i18n'; await i18n.configure({language: i18n.language.value, chunk: '${chunkNameMarker}'});`)
                }
                return {
                    code: magicString.toString(),
                    map: magicString.generateMap({hires: true}),
                    meta: {
                        vaadinI18n: {
                            keys: Array.from(keySet),
                        },
                    },
                };
            },
            renderStart(outputOptions, inputOptions) {
                chunkKeySet.clear();
            },
            async renderChunk(code, chunk) {
                const magicString = new MagicString(code);
                magicString.replaceAll(chunkNameMarker, chunk.name);
                const keySet = new Set<string>();
                for (const id of chunk.moduleIds) {
                    if (!isSourceModule(id)) {
                        continue;
                    }
                    const info = this.getModuleInfo(id);
                    (info?.meta?.vaadinI18n?.keys ?? []).forEach((key: string) => keySet.add(key));
                }
                if (keySet.size > 0) {
                    const i18nFileName = `${chunk.name}.json`;
                    fs.mkdirSync(i18nOutputDir, { recursive: true });
                    fs.writeFileSync(path.resolve(i18nOutputDir, i18nFileName), JSON.stringify({keys: Array.from(keySet)}, undefined, 2), {encoding: 'utf-8'});
                    chunkKeySet.set(chunk.name, keySet);
                }
                return { code: magicString.toString(), map: magicString.generateMap({hires: true}) };
            },
            writeBundle(options, bundle) {
                const propertyFiles = fs.readdirSync(i18nSourceDir)
                    .map(name => [name, path.resolve(i18nSourceDir, name)])
                    .filter(([_, path]) =>
                        fs.statSync(path).isFile() && path.endsWith('.properties'));
                const translationFiles = new Map<string, Map<string, string>>();
                for (const [name, path] of propertyFiles) {
                    const contents = fs.readFileSync(path, {encoding: 'utf-8'});
                    const lines = contents.split(/\r?\n/)
                        .map(line => line.trim())
                        .filter(line => !line.startsWith('#') && !line.startsWith('!'));
                    const keys = new Map<string, string>;
                    for (const line of lines) {
                        const key = line.split(/[:=]/)[0].trim();
                        keys.set(key, line);
                    }
                    translationFiles.set(name, keys);
                }
                for (const [fileName, output] of Object.entries(bundle)) {
                    if (output.type !== 'chunk') {
                        continue;
                    }
                    const keySet = chunkKeySet.get(output.name);
                    if (!keySet) {
                        continue;
                    }
                    const chunkDir = path.resolve(i18nTargetDir, output.name);
                    fs.mkdirSync(chunkDir, { recursive: true });
                    for (const [name, contents] of translationFiles.entries()) {
                        const chunkContents = Array.from(contents.entries())
                            .filter(([key, line]) => keySet.has(key))
                            .map(([_, line]) => line)
                            .join('\n');
                        fs.writeFileSync(path.resolve(chunkDir, name), chunkContents, {encoding: 'utf-8'});
                    }
                }
            }
        },
    ],
    build: {
        sourcemap: 'inline',
        minify: false,
    }
});

export default overrideVaadinConfig(customConfig);
