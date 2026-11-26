/* FF Estética Avançada · comportamento sob medida da página
   (o motor sites-incriveis.js cuida das revelações, da cena presa e do fundo que viaja) */
(function () {
  "use strict";
  var raiz = document.documentElement;
  var reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ponteiroFino = window.matchMedia("(pointer: fine)").matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var faixa = function (p, a, b) { return Math.min(1, Math.max(0, (p - a) / (b - a))); };
  var suave = function (t) { return t * t * (3 - 2 * t); };

  /* =========================================================
     1. A LENTE DE LABORATÓRIO (movimento-assinatura)
     ========================================================= */
  var lente = document.querySelector(".lente");
  var marcas = lente.querySelector(".lente-marcas");
  for (var i = 0; i < 36; i++) {
    var ang = (i / 36) * Math.PI * 2, longo = i % 3 === 0 ? 8 : 4;
    var l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 80 + Math.cos(ang) * 70); l.setAttribute("y1", 80 + Math.sin(ang) * 70);
    l.setAttribute("x2", 80 + Math.cos(ang) * (70 - longo)); l.setAttribute("y2", 80 + Math.sin(ang) * (70 - longo));
    marcas.appendChild(l);
  }
  var RAIO = 80;
  var alvoAtual = null;

  // a lente mostra a anotação INTEIRA quando passa perto dela (nada de frase cortada)
  function revelar(alvo, x, y, raio) {
    if (!alvo || raio < 30) return;
    alvo.querySelectorAll(".nota").forEach(function (n) {
      var r = n.getBoundingClientRect();
      var cx = Math.max(r.left, Math.min(x, r.right)), cy = Math.max(r.top, Math.min(y, r.bottom));
      n.classList.toggle("vista", Math.hypot(x - cx, y - cy) < raio * 0.75);
    });
  }
  function esconderRevelacao(alvo) {
    if (!alvo) return;
    alvo.querySelectorAll(".nota.vista").forEach(function (n) { n.classList.remove("vista"); });
  }

  /* --- anotações nunca saem da foto: se a etiqueta passar da borda, ela é puxada para dentro --- */
  function encaixarNotas() {
    document.querySelectorAll("[data-lente]").forEach(function (fig) {
      var f = fig.getBoundingClientRect();
      fig.querySelectorAll(".nota").forEach(function (n) {
        n.style.marginLeft = "0px"; n.style.marginTop = "0px"; n.style.whiteSpace = "";
        var r = n.getBoundingClientRect();
        if (r.width > f.width - 16) { n.style.whiteSpace = "normal"; n.style.maxWidth = (f.width - 16) + "px"; r = n.getBoundingClientRect(); }
        var dx = Math.min(0, f.right - 10 - r.right) + Math.max(0, f.left + 8 - r.left);
        var dy = Math.min(0, f.bottom - 10 - r.bottom) + Math.max(0, f.top + 8 - r.top);
        n.style.marginLeft = dx + "px"; n.style.marginTop = dy + "px";
      });
    });
  }
  encaixarNotas();
  window.addEventListener("resize", encaixarNotas);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(encaixarNotas);
  window.addEventListener("load", encaixarNotas);

  /* --- toque rápido no celular: um anel de foco discreto, como o ajuste de um microscópio --- */
  function anelDeFoco(x, y) {
    var a = document.createElement("span");
    a.className = "foco-toque"; a.style.left = x + "px"; a.style.top = y + "px";
    document.body.appendChild(a);
    setTimeout(function () { a.remove(); }, 700);
  }

  if (!reduzido) {
    /* --- computador: cursor normal do sistema (como nos sites premiados de agências e clínicas),
           com efeito SÓ onde ajuda: lupa na foto de abertura, etiqueta de contexto em elementos-chave,
           botões com ímã e uma luz âmbar bem suave nas seções escuras.
           Liga no primeiro movimento real de mouse (funciona mesmo se a página abriu em janela estreita). --- */
    var cursorLigado = false;
    var ligarCursor = function (e) {
      if (cursorLigado || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return;
      cursorLigado = true;
      window.removeEventListener("pointermove", ligarCursor);
      iniciarCursor(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", ligarCursor, { passive: true });
  }

  function iniciarCursor(x0, y0) {
    raiz.classList.add("com-cursor");
    var etiqueta = document.querySelector(".cursor-etiqueta");
    var mx = x0, my = y0, ex = x0, ey = y0, lx = x0, ly = y0, escala = 0.2, escalaAlvo = 0.2, ultimoQuadro = 0;
    var imaAtual = null;
    var escuras = ".capa, .pico, .socios, .educacao, .rodape";

    var avaliar = function (alvoEl) {
      if (!alvoEl || !alvoEl.closest) return;
      // lupa: só na foto de abertura
      var sobre = alvoEl.closest("[data-lente]");
      if (sobre !== alvoAtual) { esconderRevelacao(alvoAtual); alvoAtual = sobre; }
      lente.classList.toggle("ativa", !!sobre); lente.classList.toggle("grande", !!sobre);
      raiz.classList.toggle("na-lupa", !!sobre);
      escalaAlvo = sobre ? 1 : 0.2;
      // etiqueta de contexto: um rótulo curto ao lado da seta, só em elementos-chave
      var comRotulo = sobre ? null : alvoEl.closest("[data-cursor]");
      if (comRotulo) { etiqueta.textContent = comRotulo.getAttribute("data-cursor"); etiqueta.classList.add("visivel"); }
      else etiqueta.classList.remove("visivel");
      // ímã: o botão inclina de leve na direção do mouse
      var ima = sobre ? null : alvoEl.closest(".botao, .botao-topo, .flutuante, .botao-enviar");
      if (ima !== imaAtual) { if (imaAtual) imaAtual.style.translate = ""; imaAtual = ima; }
      // luz âmbar: só nas seções escuras
      var sec = alvoEl.closest("section, footer");
      raiz.classList.toggle("luz-ligada", !!(sec && sec.matches(escuras)) && !sobre);
    };

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      mx = e.clientX; my = e.clientY;
      avaliar(e.target);
      if (imaAtual) {
        var r = imaAtual.getBoundingClientRect();
        var dx = (mx - (r.left + r.width / 2)) * 0.22, dy = (my - (r.top + r.height / 2)) * 0.3;
        imaAtual.style.translate = dx.toFixed(1) + "px " + dy.toFixed(1) + "px";
      }
      raiz.style.setProperty("--luz-x", mx + "px"); raiz.style.setProperty("--luz-y", my + "px");
      if (performance.now() - ultimoQuadro > 120) { // se o navegador segurar os quadros, nada fica para trás
        ex = mx; ey = my; lx = mx; ly = my;
        etiqueta.style.transform = "translate3d(" + (mx + 18) + "px," + (my + 18) + "px,0)";
        lente.style.transform = "translate3d(" + mx + "px," + my + "px,0) scale(" + escalaAlvo + ")";
        if (alvoAtual) revelar(alvoAtual, mx, my, RAIO * escalaAlvo);
      }
    }, { passive: true });
    window.addEventListener("scroll", function () { avaliar(document.elementFromPoint(mx, my)); }, { passive: true });
    document.addEventListener("pointerleave", function () { etiqueta.classList.remove("visivel"); lente.classList.remove("ativa"); raiz.classList.remove("luz-ligada", "na-lupa"); });

    (function quadro() {
      ultimoQuadro = performance.now();
      ex = lerp(ex, mx, 0.3); ey = lerp(ey, my, 0.3);
      etiqueta.style.transform = "translate3d(" + (ex + 18).toFixed(1) + "px," + (ey + 18).toFixed(1) + "px,0)";
      lx = lerp(lx, mx, 0.25); ly = lerp(ly, my, 0.25); escala = lerp(escala, escalaAlvo, 0.18);
      lente.style.transform = "translate3d(" + lx.toFixed(1) + "px," + ly.toFixed(1) + "px,0) scale(" + escala.toFixed(3) + ")";
      if (alvoAtual) revelar(alvoAtual, lx, ly, RAIO * escala);
      requestAnimationFrame(quadro);
    })();
  }

  if (!reduzido) {
    /* --- celular: toque rápido deixa um anel de foco; na foto de abertura, tocar e segurar abre a lupa --- */
    var toque = null;
    document.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { cancelarToque(); return; }
      var t = e.touches[0];
      var sobre = e.target.closest("[data-lente]");
      toque = { x: t.clientX, y: t.clientY, inicio: Date.now(), moveu: false, alvo: sobre, lenteAberta: false, timer: null };
      if (sobre) {
        toque.timer = setTimeout(function () {
          if (!toque || toque.moveu) return;
          toque.lenteAberta = true;
          lente.classList.add("ativa", "grande");
          lente.style.transition = "opacity .3s";
          posicionarToque(toque.x, toque.y);
        }, 260);
      }
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!toque) return;
      var t = e.touches[0];
      if (toque.lenteAberta) {
        e.preventDefault(); // enquanto a lupa está aberta, o dedo explora a foto em vez de rolar
        toque.x = t.clientX; toque.y = t.clientY;
        posicionarToque(toque.x, toque.y);
      } else {
        if (Math.hypot(t.clientX - toque.x, t.clientY - toque.y) > 10) { toque.moveu = true; clearTimeout(toque.timer); }
      }
    }, { passive: false });
    document.addEventListener("touchend", function () {
      if (toque && !toque.lenteAberta && !toque.moveu && Date.now() - toque.inicio < 260) anelDeFoco(toque.x, toque.y);
      cancelarToque();
    });
    document.addEventListener("touchcancel", cancelarToque);
    document.querySelectorAll("[data-lente]").forEach(function (el) {
      el.addEventListener("contextmenu", function (e) { if (toque && toque.lenteAberta) e.preventDefault(); });
    });

    function posicionarToque(x, y) {
      // a lupa fica um pouco acima do dedo, para o dedo não cobrir o que ela mostra
      var ly2 = y - 90;
      lente.style.transform = "translate3d(" + x + "px," + ly2 + "px,0) scale(1)";
      revelar(toque.alvo, x, ly2, RAIO);
    }
    function cancelarToque() {
      if (!toque) return;
      clearTimeout(toque.timer);
      if (toque.lenteAberta) { lente.classList.remove("ativa", "grande"); esconderRevelacao(toque.alvo); }
      toque = null;
    }
  }

  /* =========================================================
     2. PICO: o rosto se decompõe em pele, músculo e colágeno
     ========================================================= */
  var pico = document.querySelector(".pico");
  var placas = pico ? [].slice.call(pico.querySelectorAll(".placa")) : [];
  var etapas = pico ? [].slice.call(pico.querySelectorAll("[data-etapa-pico]")) : [];
  var placaMusculo = pico && pico.querySelector(".placa-musculo");
  var rotulos = pico ? [].slice.call(pico.querySelectorAll(".rotulo-m")) : [];
  var fibras = pico && pico.querySelector(".fibras g");

  if (fibras) {
    var d = "";
    for (var f = 0; f < 46; f++) {
      var y0 = 20 + f * 15, amp = 6 + (f % 5) * 2, fase = (f * 37) % 100;
      d += "M-20 " + y0;
      for (var x = 0; x <= 840; x += 60) d += " Q " + (x + 30) + " " + (y0 + (((x + fase) / 60) % 2 ? amp : -amp)) + " " + (x + 60) + " " + y0;
      d += " ";
    }
    var caminho = document.createElementNS("http://www.w3.org/2000/svg", "path");
    caminho.setAttribute("d", d);
    caminho.setAttribute("transform", "rotate(-18 400 350)");
    fibras.appendChild(caminho);
  }

  function atualizarPico() {
    if (!pico) return;
    var p = parseFloat(getComputedStyle(pico).getPropertyValue("--progresso")) || 0;
    // etapa 1 (avaliar) acompanha as três camadas; as outras vêm enquanto o rosto se recompõe
    var etapa = p < 0.6 ? 1 : p < 0.72 ? 2 : p < 0.85 ? 3 : 4;
    etapas.forEach(function (li) { li.classList.toggle("ativa", +li.dataset.etapaPico === etapa); });

    var abre = suave(faixa(p, 0.03, 0.17)), fecha = suave(faixa(p, 0.6, 0.8));
    var e = abre * (1 - fecha);
    var estreito = window.innerWidth < 900;
    var simples = estreito || !window.matchMedia("(hover: hover)").matches;
    var passo = estreito ? 10 : 15; // % da largura entre placas
    var meio = (placas.length - 1) / 2;
    // qual camada está "na lâmina" agora: 1 pele, 2 músculo, 3 colágeno
    var foco = p < 0.18 ? 0 : p < 0.32 ? 1 : p < 0.47 ? 2 : p < 0.6 ? 3 : 0;
    placas.forEach(function (placa, k) {
      var naFrente = foco === k && e > 0.5;
      var tx = ((k - meio) * passo - 5) * e, tz = (naFrente ? 120 : -Math.abs(k - meio) * 40) * e;
      var ry = (naFrente ? -6 : -22) * e, s = 1 - (naFrente ? 0.16 : 0.3) * e;
      if (simples) {
        // celular: só 2D e sem transição em cima da rolagem (as duas brigando faziam a imagem tremer)
        // posição e tamanho mudam de forma contínua com a rolagem (sem saltos quando a camada da frente troca)
        placa.style.transform = "translate3d(" + (((k - meio) * passo - 5) * e).toFixed(2) + "%,0,0) scale(" + (1 - 0.2 * e).toFixed(3) + ")";
        placa.style.transition = "opacity .3s";
      } else {
        placa.style.transform = "translateX(" + tx.toFixed(2) + "%) translateZ(" + tz.toFixed(1) + "px) rotateY(" + ry.toFixed(2) + "deg) scale(" + s.toFixed(3) + ")";
        placa.style.transition = "transform .55s cubic-bezier(.22,1,.36,1), opacity .4s";
      }
      placa.style.zIndex = String(naFrente ? 10 : k + 1);
      var visivel = k === 0 ? 1 : suave(faixa(e, 0.2, 0.6));
      placa.style.opacity = (foco && !naFrente && e > 0.5 ? visivel * 0.55 : visivel).toFixed(3);
    });
    if (placaMusculo) placaMusculo.style.setProperty("--desenho", suave(faixa(p, 0.32, 0.43)).toFixed(3));
    rotulos.forEach(function (r) { r.style.opacity = String(foco === 2 ? faixa(p, 0.36, 0.41) : 0); });
    pico.style.setProperty("--frase", faixa(p, 0.86, 0.95).toFixed(3));
  }
  if (pico && !reduzido) {
    var pendente = false;
    var agendar = function () { if (!pendente) { pendente = true; requestAnimationFrame(function () { pendente = false; atualizarPico(); }); } };
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    atualizarPico();
  }

  /* =========================================================
     3. CONVERSA: mensagens chegam "digitando"; dúvidas viram pensamento e resposta
     ========================================================= */
  var fila = [], ocupado = false;
  function proximo() {
    if (ocupado || !fila.length) return;
    ocupado = true;
    var tarefa = fila.shift();
    tarefa(function () { ocupado = false; proximo(); });
  }
  function digitandoAntes(el, depois) {
    var dots = document.createElement("div");
    dots.className = "digitando"; dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = "<i></i><i></i><i></i>";
    if (el.classList.contains("msg-dra")) dots.style.justifySelf = "end";
    el.parentNode.insertBefore(dots, el);
    setTimeout(function () { dots.remove(); depois(); }, 650);
  }
  function observarConversa(raizBusca) {
    var itens = raizBusca.querySelectorAll("[data-chat], [data-par]");
    if (reduzido || !("IntersectionObserver" in window)) {
      itens.forEach(function (el) { el.classList.add("mostrar", "pensou", "respondeu"); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        var el = en.target;
        if (el.hasAttribute("data-chat")) {
          fila.push(function (fim) { digitandoAntes(el, function () { el.classList.add("mostrar"); setTimeout(fim, 180); }); });
        } else {
          fila.push(function (fim) {
            el.classList.add("pensou");
            setTimeout(function () {
              digitandoAntes(el.querySelector(".msg"), function () { el.classList.add("respondeu"); setTimeout(fim, 200); });
            }, 500);
          });
        }
        proximo();
      });
    }, { rootMargin: "0px 0px -18% 0px", threshold: 0.2 });
    itens.forEach(function (el) { obs.observe(el); });
  }
  observarConversa(document);

  var verMais = document.getElementById("ver-mais");
  var maisDuvidas = document.getElementById("mais-duvidas");
  if (verMais) verMais.addEventListener("click", function () {
    var abrir = maisDuvidas.hidden;
    maisDuvidas.hidden = !abrir;
    verMais.setAttribute("aria-expanded", String(abrir));
    verMais.textContent = abrir ? "Mostrar menos" : "Ver mais dúvidas";
    if (abrir) observarConversa(maisDuvidas);
  });

  /* =========================================================
     4a. ANTES DA ESTÉTICA: título que entra em foco, palavras que se alternam,
         foto em cortina e trajetória que se desenha com a rolagem
     ========================================================= */
  var titulo = document.querySelector(".foco-titulo");
  var trilho = document.querySelector(".alterna-trilho");
  var cortina = document.querySelector(".abertura");
  var trajetoria = document.querySelector(".trajetoria");
  if (reduzido) {
    if (titulo) titulo.classList.add("em-foco");
    if (trajetoria) trajetoria.querySelectorAll("li").forEach(function (li) { li.classList.add("passou"); });
  } else {
    if (titulo && "IntersectionObserver" in window) {
      var obsTitulo = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { titulo.classList.add("em-foco"); obsTitulo.disconnect(); }
      }, { threshold: 0.3 });
      obsTitulo.observe(titulo);
    }
    if (trilho) {
      var indice = 0, total = trilho.children.length; // o último repete o primeiro para o giro ser contínuo
      setInterval(function () {
        if (document.hidden) return;
        indice++;
        trilho.style.transition = "";
        trilho.style.transform = "translateY(" + (-1.25 * indice) + "em)";
        if (indice === total - 1) {
          setTimeout(function () { trilho.style.transition = "none"; trilho.style.transform = "translateY(0)"; indice = 0; }, 750);
        }
      }, 2400);
    }
    var rolarQuem = function () {
      var vh = window.innerHeight;
      if (cortina) {
        var rc = cortina.getBoundingClientRect();
        cortina.style.setProperty("--abre", faixa(vh - rc.top, vh * 0.05, vh * 0.75).toFixed(3));
      }
      if (trajetoria) {
        var rt = trajetoria.getBoundingClientRect(), linha = vh * 0.7;
        trajetoria.style.setProperty("--traco", faixa(linha - rt.top, 0, rt.height).toFixed(3));
        trajetoria.querySelectorAll("li").forEach(function (li) { li.classList.toggle("passou", li.getBoundingClientRect().top < linha); });
      }
    };
    window.addEventListener("scroll", function () { requestAnimationFrame(rolarQuem); }, { passive: true });
    rolarQuem();
  }

  /* =========================================================
     4c. SÓCIOS: a foto se abre em duas metades e o texto aparece no meio;
         FF EDUCAÇÃO: as cadeiras da turma se ocupam e a foto inclina com o ponteiro
     ========================================================= */
  // sócios: as polaroides saem empilhadas e se espalham na mesa quando a seção aparece
  var mural = document.querySelector(".mural");
  if (mural) {
    if (reduzido || !("IntersectionObserver" in window)) mural.classList.add("na-mesa");
    else {
      var obsMural = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { mural.classList.add("na-mesa"); obsMural.disconnect(); } }, { threshold: 0.3 });
      obsMural.observe(mural);
    }
  }
  var vagas = document.querySelector(".vagas");
  if (vagas) {
    if (reduzido || !("IntersectionObserver" in window)) vagas.classList.add("ocupando");
    else {
      var obsVagas = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { vagas.classList.add("ocupando"); obsVagas.disconnect(); } }, { threshold: 0.6 });
      obsVagas.observe(vagas);
    }
  }
  var inclina = document.querySelector("[data-inclina]");
  if (inclina && !reduzido) {
    if (ponteiroFino) {
      inclina.addEventListener("pointermove", function (e) {
        var r = inclina.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        inclina.style.setProperty("--ry", (px * 12).toFixed(2) + "deg");
        inclina.style.setProperty("--rx", (-py * 10).toFixed(2) + "deg");
      });
      inclina.addEventListener("pointerleave", function () { inclina.style.setProperty("--rx", "0deg"); inclina.style.setProperty("--ry", "0deg"); });
    } else {
      // no celular a foto inclina de leve conforme passa pela tela
      window.addEventListener("scroll", function () {
        var r = inclina.getBoundingClientRect(), c = (r.top + r.height / 2) / innerHeight - 0.5;
        inclina.style.setProperty("--rx", (c * 10).toFixed(2) + "deg");
      }, { passive: true });
    }
  }

  /* =========================================================
     4b. TRATAMENTOS: receituário que imprime a receita da queixa escolhida
     ========================================================= */
  var abas = [].slice.call(document.querySelectorAll('.queixas [role="tab"]'));
  var impressora = document.querySelector(".impressora");
  var trocando = false;
  function imprimir(receita) {
    receita.hidden = false;
    receita.classList.remove("pronta", "saindo");
    if (reduzido) { receita.classList.add("pronta"); return; }
    void receita.offsetWidth;
    receita.classList.add("imprimindo");
    impressora.classList.add("imprimindo");
    setTimeout(function () {
      receita.classList.remove("imprimindo");
      receita.classList.add("pronta");
      impressora.classList.remove("imprimindo");
    }, 1150);
  }
  function escolherAba(aba, focar) {
    if (trocando || aba.getAttribute("aria-selected") === "true") return;
    var atual = abas.filter(function (a) { return a.getAttribute("aria-selected") === "true"; })[0];
    var velha = atual && document.getElementById(atual.getAttribute("aria-controls"));
    var nova = document.getElementById(aba.getAttribute("aria-controls"));
    abas.forEach(function (a) { var sel = a === aba; a.setAttribute("aria-selected", String(sel)); a.tabIndex = sel ? 0 : -1; });
    if (focar) aba.focus();
    aba.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduzido ? "auto" : "smooth" });
    if (velha && !reduzido) {
      trocando = true;
      velha.classList.remove("pronta");
      velha.classList.add("saindo");
      setTimeout(function () { velha.hidden = true; velha.classList.remove("saindo"); trocando = false; }, 480);
    } else if (velha) { velha.hidden = true; }
    imprimir(nova);
  }
  abas.forEach(function (aba, k) {
    aba.addEventListener("click", function () { escolherAba(aba, false); });
    aba.addEventListener("keydown", function (e) {
      var passo = (e.key === "ArrowDown" || e.key === "ArrowRight") ? 1 : (e.key === "ArrowUp" || e.key === "ArrowLeft") ? -1 : 0;
      if (!passo) return;
      e.preventDefault();
      escolherAba(abas[(k + passo + abas.length) % abas.length], true);
    });
  });
  // a primeira receita imprime quando a seção aparece
  var primeira = document.getElementById("r1");
  if (primeira && impressora) {
    if (reduzido || !("IntersectionObserver" in window)) primeira.classList.add("pronta");
    else {
      primeira.style.visibility = "hidden";
      var obsRec = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        obsRec.disconnect();
        primeira.style.visibility = "";
        imprimir(primeira);
      }, { threshold: 0.35 });
      obsRec.observe(impressora);
    }
  }

  /* =========================================================
     5. FORMULÁRIO: mensagem pronta no WhatsApp para cada escolha
     ========================================================= */
  var form = document.getElementById("formulario");
  var WHATS = "5519992626842";
  var campoTrat = document.getElementById("campo-trat");
  var rotuloObs = document.getElementById("rotulo-obs");
  var previa = form.querySelector(".previa");

  function escolha() { var r = form.querySelector('input[name="busca"]:checked'); return r ? r.value : ""; }
  function ajustarCampos() {
    var v = escolha();
    campoTrat.hidden = v !== "procedimento";
    rotuloObs.textContent = v === "duvida" ? "Qual é a sua dúvida?" : v === "mentoria" ? "Você já atua na estética? Conte um pouco (opcional)" : "Quer contar algo a mais? (opcional)";
  }
  form.querySelectorAll('input[name="busca"]').forEach(function (r) { r.addEventListener("change", ajustarCampos); });

  document.querySelectorAll("[data-escolha]").forEach(function (a) {
    a.addEventListener("click", function () {
      var r = form.querySelector('input[name="busca"][value="' + a.dataset.escolha + '"]');
      if (r) { r.checked = true; ajustarCampos(); }
    });
  });

  function montarMensagem(nome, v, trat, obs) {
    var extra = obs ? "\n\n" + obs : "";
    if (v === "procedimento") {
      return trat
        ? "Olá, Dra. Fernanda! Aqui é " + nome + ", vim pelo site. Tenho interesse em " + trat.toLowerCase() + " e gostaria de agendar uma avaliação." + extra
        : "Olá, Dra. Fernanda! Aqui é " + nome + ", vim pelo site. Quero fazer um procedimento estético, mas ainda não sei qual é o ideal para mim. Podemos marcar uma avaliação?" + extra;
    }
    if (v === "avaliacao") return "Olá, Dra. Fernanda! Aqui é " + nome + ", vim pelo site. Gostaria de marcar uma avaliação para entender o que é melhor para o meu rosto." + extra;
    if (v === "mentoria") return "Olá, Dra. Fernanda! Aqui é " + nome + ", vim pelo site. Trabalho com estética e tenho interesse nas Mentorias FF e nos cursos. Quando abre a próxima turma?" + extra;
    return "Olá, Dra. Fernanda! Aqui é " + nome + ", vim pelo site e tenho uma dúvida: " + (obs || "");
  }

  function mostrarErro(id, mostrar) { document.getElementById(id).hidden = !mostrar; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nome = form.nome.value.trim();
    var digitos = form.whats.value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    var v = escolha();
    var obs = form.obs.value.trim();
    var ok = true;
    mostrarErro("erro-nome", !nome); if (!nome) ok = false;
    var foneOk = digitos.length === 10 || digitos.length === 11;
    mostrarErro("erro-whats", !foneOk); if (!foneOk) ok = false;
    mostrarErro("erro-busca", !v); if (!v) ok = false;
    var lgpd = document.getElementById("lgpd").checked;
    mostrarErro("erro-lgpd", !lgpd); if (!lgpd) ok = false;
    if (v === "duvida" && !obs) { ok = false; form.obs.focus(); previa.textContent = "Escreva a sua dúvida no campo acima."; return; }
    if (!ok) {
      var primeiro = form.querySelector(".erro:not([hidden])");
      var campo = primeiro && primeiro.parentNode.querySelector("input, textarea, select");
      if (primeiro && primeiro.id === "erro-lgpd") campo = document.getElementById("lgpd");
      if (campo) campo.focus();
      return;
    }

    var primeiroNome = nome.split(/\s+/)[0];
    var texto = montarMensagem(primeiroNome, v, form.trat.value, obs) + "\n\nMeu WhatsApp: " + digitos;
    var url = "https://wa.me/" + WHATS + "?text=" + encodeURIComponent(texto);
    previa.textContent = "Abrimos o WhatsApp com a sua mensagem. Se não abriu, toque de novo no botão.";
    // com "noopener" o navegador sempre devolve null, e o site ia trocar a própria aba também;
    // por isso abrimos normal e cortamos o vínculo depois. Só cai no plano B se o bloqueador impedir.
    var janela = window.open(url, "_blank");
    if (janela) { try { janela.opener = null; } catch (err) {} }
    else window.location.href = url;
  });

  /* =========================================================
     6. BOTÃO FLUTUANTE: aparece depois da capa, some no formulário
     ========================================================= */
  var flutuante = document.querySelector(".flutuante");
  var capa = document.querySelector(".capa"), fecho = document.querySelector(".fecho");
  if ("IntersectionObserver" in window) {
    var capaVisivel = true, fechoVisivel = false;
    var atualizar = function () { flutuante.classList.toggle("visivel", !capaVisivel && !fechoVisivel); };
    new IntersectionObserver(function (en) { capaVisivel = en[0].isIntersecting; atualizar(); }, { threshold: 0.15 }).observe(capa);
    new IntersectionObserver(function (en) { fechoVisivel = en[0].isIntersecting; atualizar(); }, { threshold: 0.1 }).observe(fecho);
  } else flutuante.classList.add("visivel");
})();
