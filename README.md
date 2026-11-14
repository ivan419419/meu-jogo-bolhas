# Bolhas em Órbita — protótipo

Protótipo jogável de Bubble Shooter em Canvas, feito sem engine ou framework pesado. A lógica do tabuleiro continua separada do desenho: `game/browser.ts` importa `HexGrid` de `game/logica.ts`, movimento/encaixe de `game/tiro.ts` e resolução de grupos/queda de `game/estouro.ts`.

## Jogar

Abra `index.html` diretamente no Chrome. O arquivo contém o motor compilado e não precisa de servidor, instalação ou conexão com a internet.

Mova o ponteiro para ver a mira; clique ou toque no tabuleiro para disparar. A linha pontilhada prevê ricochetes. O botão **Trocar** alterna a bolha atual e a próxima. Grupos conectados de três ou mais estouram; bolhas sem ligação com o teto caem.

## Desafio por link

Na página hospedada, toque em **Criar desafio** para iniciar uma partida com uma semente compartilhável. O link usa `?desafio=<semente>`; quem abrir o mesmo link recebe o mesmo tabuleiro e a mesma sequência determinística de sorteios, e **Jogar de novo** reinicia essa mesma partida. Ao terminar, **Compartilhar placar** envia a pontuação junto com o link. Os placares são comparados entre as pessoas — não há ranking ou servidor.

O compartilhamento entre aparelhos requer que o jogo esteja em uma URL acessível, como a versão hospedada. Abrir `index.html` diretamente (`file://`) continua funcionando para jogar localmente, mas esse endereço não serve como link de desafio para outras pessoas. O modo normal continua aleatório e sem alterar o endereço até que um desafio seja criado ou aberto.

## Regenerar o HTML após editar o TypeScript

Com Node.js instalado, na pasta do projeto execute:

```bash
npm install
npm run check
npm run build
```

`npm run build` empacota `game/browser.ts` e seus imports reais no `index.html`. O modelo visual da página está em `scripts/index.template.html`.
