# Prévia Android — Bolhas em Órbita

Experimento isolado para gerar APK **de teste**, sem alterar a versão web. O gerador monta uma cópia local do jogo num projeto Android WebViewAssetLoader. A URL de desafio permanece a URL pública web; a versão Android compartilha via menu nativo. Não há vínculo automático Android App Links: desafios abrem no navegador, como já fazem hoje.

## Teste

O fluxo manual `Android preview debug` compila um APK debug e o guarda temporariamente como artefato do GitHub Actions. O APK é de desenvolvimento, não é pacote de produção; requer instalação manual e teste em Android físico. A assinatura debug e o identificador `br.com.ivanmoreira.bolhas.preview` são provisórios. Nenhum dado de assinatura é fornecido ou armazenado no repositório.

Para executar localmente: Node 22, Python 3, Java 17, Android SDK 36 e Gradle 8.11.1. Rode `npm ci`, `python3 android_preview.py`, entre em `android-preview` e rode `gradle :app:assembleDebug`.

Sem alteração em `index.html`, TypeScript, histórico ou links do jogo web publicado. A cópia Android omite o script de analytics da Vercel. Ainda faltam testes de interface em celulares, comportamento offline, navegação, compatibilidade de compartilhamento, conformidade, política de privacidade, identificação definitiva, AAB assinado, dados de loja, classificação e testes fechados. Não publicar sem autorização.
