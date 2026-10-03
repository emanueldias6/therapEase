# TherapEase — webapp de teste (iPhone)

Protótipo da app do paciente para testar no iPhone, com a câmara frontal e deteção de movimento no próprio telemóvel.

## O que funciona
- **Navegação:** todos os ecrãs do canvas, com a mesma navegação do protótipo. Os ecrãs com contagem avançam sozinhos.
- **Câmara:** a câmara frontal real aparece em espelho nos ecrãs de posicionamento, calibração e exercício.
- **Posicionamento:**
  - C15 → C16/C17 → C18: o retângulo muda conforme o corpo está ou não lá dentro.
  - E18H → E19H → E01H: o mesmo, na mudança de posição (telemóvel na horizontal).
- **Execução (E04 e E08, e E04H/E08H na horizontal):**
  - O skeleton é o asset fornecido e acompanha o corpo.
  - As zonas ficam verdes quando atingem o objetivo, e só a zona a corrigir fica laranja, com sinal sonoro e voz.
  - As repetições contam sozinhas e a cor de cada uma é a qualidade.
  - Ao fim de 15 repetições segue para "Série concluída". Os pontos que vão para a roda são as repetições que fizeste.
- **Rotação:** ao rodar o telemóvel durante o exercício, a app mostra a versão horizontal.
- **Voz:** a voz lê o guião de cada ecrã. Não aparece escrita no ecrã.

## Novidades da v30
- **A16 · Olá:** a cápsula de vidro abre a câmara frontal para tirar a fotografia. Por baixo, "ou selecione um avatar", com 8 pessoas ilustradas. O avatar escolhido aparece na cápsula.
- **Estado premido** em botões, opções, cartões e itens de menu: ao tocar, desce 2 px e encolhe para 97 %. Ao largar, volta com uma mola.
- **Háptico:** vibra no Android. No iPhone (Safari 18 ou mais recente) usa o motor háptico através de um interruptor escondido. Numa app nativa: UIImpactFeedbackGenerator (.light / .medium) e .success.
- **Teclas do PIN em vidro** (A09–A11).
- **Ícones de estado em cápsula de vidro** (1 : 1,25): A06–A08, A12, B10, C20–C22, E13, F07–F10, G07, H03, H04, H09.
- **A17 e A18** com as fotos e as posições do Figma. **A19** com caras coloridas, de "Muito mal" a "Muito bem".
- **Ecrãs novos A04T · Termos e condições e A04P · Política de privacidade**, abertos a partir das ligações do A04. O texto é um rascunho a validar pelo jurídico.

## Novidades da v29
- A web foi comparada ecrã a ecrã com o Figma e corrigida para ficar igual: posições, espaços, cores e raios.
- Botões secundários em Secondary/50 com sombra. Etiquetas a 10 px. Avisos com texto Primary/900.
- Ecrãs refeitos como no Figma: C04/C04B/C13 (cartões de exercício), C02/C25/C28, G03, G05, G10, B07, B10, B12, B13, G07, A13/A14.

## Novidades da v28
- Cores sólidas da biblioteca do Figma em todos os ecrãs. Os cartões têm raio de 16 px e ficam a 12 px uns dos outros.
- Pop-ups no estilo novo: A05, A14, E11 ("Quer sair deste exercício?") e B14 ("Quer sair da conta?").
- Vocabulário: "Parar por hoje" sai do exercício e "Sair da conta" faz logout.
- Preparação da banda em 3 passos sem botões, E20A → E20B → E20C. Avança sozinho.
- F02: seletor de intensidade com deslizador.
- H06–H08: caixa de mensagem que cresce com o texto.
- Botão "?" com legenda no calendário, no progresso semanal e nas tendências.
- G05: novo cartão "Nesta sessão".

## Atalhos de teste
- **Toque duplo** no ecrã de execução termina a série logo.
- Tocar no ecrã avança nos ecrãs que avançam sozinhos, como no protótipo.

## Correr no computador (sem publicar)
Precisa de ser servido por HTTP; abrir o `index.html` diretamente não funciona.

```
cd www
python3 -m http.server 8000
```

Abrir `http://localhost:8000` no Chrome ou no Safari do computador. A câmara funciona em `localhost`.

## No iPhone
O iPhone só dá acesso à câmara em páginas **HTTPS**. Por isso, para testar no telemóvel é preciso publicar a pasta `www`, por exemplo no GitHub Pages:
1. Criar um repositório e enviar o conteúdo da pasta `www` (o ficheiro `.nojekyll` incluído).
2. No repositório: Settings → Pages → Source: "Deploy from a branch", branch `main`, pasta `/ (root)`.
3. Abrir o endereço `https://<utilizador>.github.io/<repositório>/` no **Safari** do iPhone.
4. Partilhar → **Adicionar ao ecrã principal**. Abrir a partir do ícone: abre em ecrã inteiro, sem a barra do Safari.
5. Aceitar o acesso à câmara (o iOS pode voltar a perguntar em cada abertura).

## Notas
- **Internet na primeira vez:** o modelo de deteção de pose (cerca de 5 MB) descarrega-se na primeira utilização. Para funcionar sem internet, pôr o ficheiro `pose_landmarker_lite.task` na pasta `models/`.
- **Privacidade:** a imagem da câmara é processada no telemóvel e não sai do dispositivo. A biblioteca MediaPipe envia à Google métricas de utilização, mas não as imagens.
- **Regras de avaliação:** as regras de repetição e de correção são simplificadas, só para teste, e não são métricas clínicas:
  - elevação de braços: objetivo de 80° entre o braço e o tronco;
  - quatro apoios: braço e perna alinhados com o tronco.
- **Fontes:** Nunito e Montserrat vêm incluídas na pasta `fonts`, por isso o texto fica igual ao do canvas mesmo sem internet.
- **Ecrã ligado:** o ecrã fica ligado durante a app nas versões recentes do iOS.
