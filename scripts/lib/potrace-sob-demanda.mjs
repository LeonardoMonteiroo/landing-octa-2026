/**
 * O potrace (vetorização de bitmap) só entra quando um extrator precisa dele.
 *
 * Ele traz uns 77 pacotes junto, quase todos do jimp, e o projeto evita
 * dependência de propósito: por isso não está no package.json nem no lock, e
 * não entra no `npm install` de ninguém. Na primeira rodada do extrator ele é
 * instalado em node_modules/.cache/potrace-<versão>/ (um projetinho próprio,
 * com package.json só dele); apagar node_modules apaga junto, e a rodada
 * seguinte instala de novo. A versão é fixa para o vetor sair igual sempre.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const VERSAO_POTRACE = "2.1.8";

/**
 * O módulo do potrace, instalado na hora se ainda não estiver no cache.
 * @param {string} raiz a raiz do repositório
 */
export function carregarPotrace(raiz) {
  const pasta = join(raiz, "node_modules", ".cache", `potrace-${VERSAO_POTRACE}`);
  if (!existsSync(join(pasta, "node_modules", "potrace"))) {
    mkdirSync(pasta, { recursive: true });
    // O package.json próprio faz a pasta ser a raiz da instalação: sem ele o
    // npm subiria até o package.json do projeto e gravaria o potrace lá.
    writeFileSync(join(pasta, "package.json"), `${JSON.stringify({ private: true }, null, 2)}\n`);
    console.log(`  instalando o potrace ${VERSAO_POTRACE} só para este extrator (fora do package.json)…`);
    execFileSync(
      "npm",
      ["install", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", `potrace@${VERSAO_POTRACE}`],
      { cwd: pasta, stdio: "inherit", shell: process.platform === "win32" },
    );
  }
  return createRequire(join(pasta, "package.json"))("potrace");
}
