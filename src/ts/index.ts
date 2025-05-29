import { Product } from "./Product";

const urlServidor = "http://localhost:5000";

interface Filtros {
  cor: string[];
  tamanho: string[];
  preco: string[];
}

class GerenciadorProdutos {
  private listaProdutos: Product[] = [];
  private todosProdutos: Product[] = [];
  private ordenacaoSelecionada = "recentes";
  private carregarMais = false;
  private filtrosAtivos: Filtros = { cor: [], tamanho: [], preco: [] };
  private coresDisponiveis = new Set<string>();
  private tamanhosDisponiveis = new Set<string>();
  private minicarrinho = new Map<string, number>();
  private itensPorPagina = 9;

  constructor() {
    this.inicializar();
  }

  private async inicializar(): Promise<void> {
    try {
      await this.carregarProdutos();
      this.construirFiltros();
      this.construirPrateleira();
      this.construirMinicarrinho();
      this.configurarEventos();
    } catch (erro) {
      console.error("Erro ao inicializar:", erro);
    }
  }

  private async carregarProdutos(): Promise<void> {
    const resposta = await fetch(`${urlServidor}/products`);
    const dados = await resposta.json();
    this.listaProdutos = dados;
    this.todosProdutos = [...dados];
    
    dados.forEach((produto: Product) => {
      this.coresDisponiveis.add(produto.color);
      produto.size.forEach(tamanho => this.tamanhosDisponiveis.add(tamanho));
    });
  }

  private construirFiltros(): void {
    this.construirFiltrosCores();
    this.construirFiltrosTamanhos();
    this.construirFiltrosPreco();
  }

  private construirFiltrosCores(): void {
    const containerCores = document.querySelector(".filterColors");
    if (!containerCores) return;

    const elementosExistentes = containerCores.querySelectorAll('.colorContainer');
    elementosExistentes.forEach(el => el.remove());

    Array.from(this.coresDisponiveis).forEach((cor, indice) => {
      const containerElemento = this.criarFiltroElemento({
        tipo: "cor",
        valor: cor,
        id: cor,
        texto: cor,
        oculto: indice >= 5
      });
      containerCores.prepend(containerElemento);
    });
  }

  private construirFiltrosTamanhos(): void {
    const containerTamanhos = document.querySelector(".filterSizes .checkbox-grid");
    if (!containerTamanhos) return;

    containerTamanhos.innerHTML = "";

    const tamanhosOrdenados = Array.from(this.tamanhosDisponiveis).sort();
    
    tamanhosOrdenados.forEach(tamanho => {
      const elemento = this.criarSeletorTamanho(tamanho);
      containerTamanhos.append(elemento);
    });

    this.configurarVerMaisTamanhos();
  }

  private construirFiltrosPreco(): void {
    const precos = this.todosProdutos.map(p => p.price).sort((a, b) => a - b);
    const menorPreco = Math.floor(precos[0]);
    const maiorPreco = Math.ceil(precos[precos.length - 1]);
    
    const faixasPreco = this.criarFaixasPreco(menorPreco, maiorPreco);
    
    const containerPrecos = document.querySelector(".filterPrices .filterColors");
    if (!containerPrecos) return;
    
    const elementosExistentes = containerPrecos.querySelectorAll('.colorContainer');
    elementosExistentes.forEach(el => el.remove());
    
    faixasPreco.forEach(faixa => {
      const elemento = this.criarFiltroElemento({
        tipo: "preco",
        valor: faixa.valor,
        id: faixa.id,
        texto: faixa.texto
      });
      containerPrecos.append(elemento);
    });
  }

  private criarFaixasPreco(min: number, max: number) {
    const faixas = [];
    const intervalo = Math.ceil((max - min) / 4);
    
    for (let i = 0; i < 4; i++) {
      const inicio = min + (i * intervalo);
      const fim = i === 3 ? max : min + ((i + 1) * intervalo) - 1;
      
      faixas.push({
        valor: `${inicio}-${fim}`,
        id: `${inicio}-${fim}`,
        texto: `de R$${inicio} até R$${fim}`
      });
    }
    
    if (max > 500) {
      faixas.push({
        valor: `500-${max}`,
        id: `500-${max}`,
        texto: `a partir de R$500`
      });
    }
    
    return faixas;
  }

  private configurarVerMaisTamanhos(): void {
    const containerTamanhos = document.querySelector(".filterSizes");
    const checkboxGrid = containerTamanhos?.querySelector(".checkbox-grid");
    
    if (!containerTamanhos || !checkboxGrid) return;

    setTimeout(() => {
      const alturaTotal = checkboxGrid.scrollHeight;
      const limiteAltura = 180;
      
      let verMaisBtn = containerTamanhos.querySelector(".verMaisTamanhos") as HTMLElement;
      
      if (!verMaisBtn) {
        verMaisBtn = document.createElement("p");
        verMaisBtn.className = "verMaisTamanhos";
        this.aplicarEstilosBotaoVerMais(verMaisBtn);
        containerTamanhos.append(verMaisBtn);
      }

      if (alturaTotal > limiteAltura) {
        (checkboxGrid as HTMLElement).style.maxHeight = `${limiteAltura}px`;
        (checkboxGrid as HTMLElement).style.overflow = "hidden";
        (checkboxGrid as HTMLElement).style.transition = "max-height 0.4s ease-in-out";
        
        verMaisBtn.textContent = "Ver mais tamanhos";
        verMaisBtn.dataset.expandido = "false";
        verMaisBtn.style.display = "block";

        const novoBtn = verMaisBtn.cloneNode(true) as HTMLElement;
        verMaisBtn.parentNode?.replaceChild(novoBtn, verMaisBtn);

        this.aplicarEstilosBotaoVerMais(novoBtn);

        novoBtn.addEventListener("click", () => {
          const expandido = novoBtn.dataset.expandido === "true";
          
          if (expandido) {
            (checkboxGrid as HTMLElement).style.maxHeight = `${limiteAltura}px`;
            novoBtn.textContent = "Ver mais tamanhos";
            novoBtn.dataset.expandido = "false";
          } else {
            (checkboxGrid as HTMLElement).style.maxHeight = `${alturaTotal}px`;
            novoBtn.textContent = "Ver menos tamanhos";
            novoBtn.dataset.expandido = "true";
          }
        });

        novoBtn.addEventListener("mouseenter", () => {
          novoBtn.style.color = "#FB953E";
          novoBtn.style.textDecorationColor = "#FB953E";
        });

        novoBtn.addEventListener("mouseleave", () => {
          novoBtn.style.color = "#666666";
          novoBtn.style.textDecorationColor = "#666666";
        });

      } else {
        verMaisBtn.style.display = "none";
        (checkboxGrid as HTMLElement).style.maxHeight = "none";
        (checkboxGrid as HTMLElement).style.overflow = "visible";
      }
    }, 50);
  }

  private aplicarEstilosBotaoVerMais(botao: HTMLElement): void {
    botao.style.cursor = "pointer";
    botao.style.textDecoration = "underline";
    botao.style.color = "#666666";
    botao.style.fontSize = "14px";
    botao.style.marginTop = "10px";
    botao.style.transition = "color 0.2s ease, text-decoration-color 0.2s ease";
    botao.style.fontWeight = "400";
    botao.style.textDecorationColor = "#666666";
  }

  private criarFiltroElemento(opcoes: {
    tipo: string;
    valor: string;
    id: string;
    texto: string;
    oculto?: boolean;
  }): HTMLLabelElement {
    const { tipo, valor, id, texto, oculto = false } = opcoes;
    
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = tipo === "cor" ? "color" : tipo === "preco" ? "preco" : tipo;
    input.value = valor;
    input.id = id;

    const containerElemento = document.createElement('label');
    containerElemento.className = "colorContainer";
    containerElemento.htmlFor = id;
    containerElemento.style.cursor = "pointer";

    const rotulo = document.createElement('label');
    rotulo.htmlFor = id;
    rotulo.innerHTML = texto;
    rotulo.style.cursor = "pointer";

    const pseudoSeletor = document.createElement('div');
    pseudoSeletor.appendChild(document.createElement('div'));
    pseudoSeletor.style.cursor = "pointer";

    containerElemento.append(input, pseudoSeletor, rotulo);

    if (oculto) {
      containerElemento.classList.add("hideMoreColor");
    }

    return containerElemento;
  }

  private criarSeletorTamanho(tamanho: string): HTMLDivElement {
    const elemento = document.createElement("div");
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = tamanho;
    input.name = "size";
    input.value = tamanho;
    input.className = "sizeCheckbox";

    const rotulo = document.createElement("label");
    rotulo.innerHTML = tamanho;
    rotulo.htmlFor = tamanho;
    rotulo.style.cursor = "pointer";

    elemento.append(input, rotulo);
    return elemento;
  }

  private ordenarProdutos(ordem: string): void {
    switch (ordem) {
      case 'recentes':
        this.listaProdutos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'menorpreco':
        this.listaProdutos.sort((a, b) => a.price - b.price);
        break;
      case 'maiorpreco':
        this.listaProdutos.sort((a, b) => b.price - a.price);
        break;
    }
  }

  private aplicarFiltros(): Product[] {
    return this.listaProdutos.filter(produto => {
      if (this.filtrosAtivos.cor.length > 0 && !this.filtrosAtivos.cor.includes(produto.color)) {
        return false;
      }

      if (this.filtrosAtivos.tamanho.length > 0) {
        const temTamanho = produto.size.some(tamanho => this.filtrosAtivos.tamanho.includes(tamanho));
        if (!temTamanho) return false;
      }

      if (this.filtrosAtivos.preco.length > 0) {
        const precoValido = this.filtrosAtivos.preco.some(faixa => {
          const [min, max] = faixa.split("-").map(Number);
          return produto.price >= min && produto.price <= max;
        });
        if (!precoValido) return false;
      }

      return true;
    });
  }

  private construirPrateleira(): void {
    const prateleira = document.querySelector("#products");
    if (!prateleira) return;

    prateleira.innerHTML = "";
    this.ordenarProdutos(this.ordenacaoSelecionada);
    
    const produtosFiltrados = this.aplicarFiltros();
    const produtosParaExibir = this.carregarMais 
      ? produtosFiltrados 
      : produtosFiltrados.slice(0, this.itensPorPagina);

    produtosParaExibir.forEach(produto => {
      const cartaoProduto = this.criarCartaoProduto(produto);
      prateleira.append(cartaoProduto);
    });

    this.atualizarBotaoCarregarMais(produtosFiltrados.length);
  }

  private atualizarBotaoCarregarMais(totalProdutos: number): void {
    const botaoCarregarMais = document.querySelector("#loadMore");
    if (!botaoCarregarMais) return;

    const produtosExibidos = this.carregarMais ? totalProdutos : Math.min(this.itensPorPagina, totalProdutos);
    
    if (produtosExibidos >= totalProdutos) {
      botaoCarregarMais.classList.add("hidden");
    } else {
      botaoCarregarMais.classList.remove("hidden");
    }
  }

  private criarCartaoProduto(produto: Product): HTMLDivElement {
    const containerProduto = document.createElement('div');

    const imagemProduto = document.createElement('img');
    imagemProduto.src = produto.image;

    const nomeProduto = document.createElement('h2');
    nomeProduto.innerHTML = produto.name;
    nomeProduto.className = "productName";

    const precoProduto = document.createElement('p');
    precoProduto.className = "productPrice";
    precoProduto.innerHTML = `R$ ${produto.price.toFixed(2).replace(".", ",")}`;

    const parcelamento = document.createElement('p');
    parcelamento.className = "productInstallment";
    parcelamento.innerHTML = `até ${produto.parcelamento[0]}x de R$${produto.parcelamento[1].toFixed(2).replace(".", ",")}`;

    const botaoComprar = document.createElement('button');
    botaoComprar.innerHTML = "COMPRAR";
    botaoComprar.addEventListener("click", () => this.adicionarAoCarrinho(produto.id));

    containerProduto.append(imagemProduto, nomeProduto, precoProduto, parcelamento, botaoComprar);
    return containerProduto;
  }

  private adicionarAoCarrinho(id: string): void {
    const quantidadeAtual = this.minicarrinho.get(id) || 0;
    this.minicarrinho.set(id, quantidadeAtual + 1);
    this.construirMinicarrinho();
    this.abrirMinicarrinho();
  }

  private removerDoCarrinho(id: string): void {
    this.minicarrinho.set(id, 0);
    this.construirMinicarrinho();
  }

  private construirMinicarrinho(): void {
    const containerItens = document.querySelector(".minicartItems");
    const contadorCarrinho = document.querySelector("#minicartContainer div");
    
    if (!containerItens || !contadorCarrinho) return;

    containerItens.innerHTML = "";
    let valorTotal = 0;
    let totalItens = 0;

    if (this.minicarrinho.size === 0) {
      containerItens.innerHTML = "Oops, seu carrinho está vazio!";
      contadorCarrinho.innerHTML = "0";
      document.querySelector(".minicartTotal")!.innerHTML = "R$ 0,00";
      return;
    }

    this.minicarrinho.forEach((quantidade, idProduto) => {
      if (quantidade === 0) return;

      const produto = this.todosProdutos.find(p => p.id === idProduto);
      if (!produto) return;

      const containerItem = this.criarItemMinicarrinho(produto, quantidade);
      containerItens.append(containerItem);
      
      valorTotal += produto.price * quantidade;
      totalItens += quantidade;
    });

    contadorCarrinho.innerHTML = totalItens.toString();
    document.querySelector(".minicartTotal")!.innerHTML = `R$ ${valorTotal.toFixed(2).replace(".", ",")}`;
  }

  private criarItemMinicarrinho(produto: Product, quantidade: number): HTMLDivElement {
    const containerItem = document.createElement("div");
    containerItem.classList.add("minicartItemContainer");

    const imagemItem = document.createElement("img");
    imagemItem.src = produto.image;
    imagemItem.classList.add("minicartItemImage");

    const containerInfoProduto = document.createElement("div");
    containerInfoProduto.classList.add("minicartProductInfo");

    const headerInfo = document.createElement("div");
    headerInfo.classList.add("minicartItemHeader");

    const tituloProduto = document.createElement("p");
    tituloProduto.innerHTML = produto.name;
    tituloProduto.classList.add("minicartProductName");

    const removerDoCarrinho = document.createElement('img');
    removerDoCarrinho.src = "./img/trash-blank.png";
    removerDoCarrinho.classList.add("removeFromMinicart");
    removerDoCarrinho.title = "Remover produto";
    removerDoCarrinho.addEventListener("click", () => this.removerDoCarrinho(produto.id));

    headerInfo.append(tituloProduto, removerDoCarrinho);

    const containerQuantidadePreco = document.createElement("div");
    containerQuantidadePreco.classList.add("minicartQuantityPriceContainer");

    const containerQuantidade = document.createElement("div");
    containerQuantidade.classList.add("minicartQuantityControls");

    const botaoMenos = document.createElement("button");
    botaoMenos.innerHTML = "-";
    botaoMenos.classList.add("quantityBtn", "quantityBtnMinus");
    botaoMenos.addEventListener("click", () => this.decrementarQuantidade(produto.id));

    const quantidadeDisplay = document.createElement("span");
    quantidadeDisplay.innerHTML = quantidade.toString();
    quantidadeDisplay.classList.add("quantityDisplay");

    const botaoMais = document.createElement("button");
    botaoMais.innerHTML = "+";
    botaoMais.classList.add("quantityBtn", "quantityBtnPlus");
    botaoMais.addEventListener("click", () => this.incrementarQuantidade(produto.id));

    containerQuantidade.append(botaoMenos, quantidadeDisplay, botaoMais);

    // Preço
    const precoProduto = document.createElement("p");
    precoProduto.innerHTML = `R$ ${(produto.price * quantidade).toFixed(2).replace(".", ",")}`;
    precoProduto.classList.add("minicartPrice");

    containerQuantidadePreco.append(containerQuantidade, precoProduto);

    // Montar a estrutura da div de informações
    containerInfoProduto.append(headerInfo, containerQuantidadePreco);

    // Montar o item final
    containerItem.append(imagemItem, containerInfoProduto);
    return containerItem;
  }

  private incrementarQuantidade(id: string): void {
    const quantidadeAtual = this.minicarrinho.get(id) || 0;
    this.minicarrinho.set(id, quantidadeAtual + 1);
    this.construirMinicarrinho();
  }

  private decrementarQuantidade(id: string): void {
    const quantidadeAtual = this.minicarrinho.get(id) || 0;
    if (quantidadeAtual > 1) {
      this.minicarrinho.set(id, quantidadeAtual - 1);
    } else {
      this.minicarrinho.delete(id);
    }
    this.construirMinicarrinho();
  }

  private abrirMinicarrinho(): void {
    document.querySelector('.minicartShelfContainer')?.classList.add("active");
  }

  private configurarEventos(): void {
    this.configurarEventosFiltros();
    this.configurarEventosOrdenacao();
    this.configurarEventosMinicarrinho();
    this.configurarEventosMobile();
  }

  private configurarEventosFiltros(): void {
    document.addEventListener("change", (evento) => {
      const alvo = evento.target as HTMLInputElement;
      if (!alvo.name || !["color", "size", "preco"].includes(alvo.name)) return;

      const chave = alvo.name === "color" ? "cor" : 
                   alvo.name === "size" ? "tamanho" : "preco";

      if (alvo.checked) {
        this.filtrosAtivos[chave].push(alvo.value);
      } else {
        this.filtrosAtivos[chave] = this.filtrosAtivos[chave].filter(item => item !== alvo.value);
      }

      this.carregarMais = false;
      this.construirPrateleira();
    });

    document.querySelector(".showAllColors")?.addEventListener("click", () => {
      document.querySelector(".showAllColors")?.classList.add("hidden");
      document.querySelectorAll(".hideMoreColor").forEach(elemento => 
        elemento.classList.remove("hideMoreColor")
      );
    });

    document.querySelector("#clearFilter")?.addEventListener("click", () => {
      document.querySelectorAll('#filters input[type="checkbox"]').forEach(input => {
        (input as HTMLInputElement).checked = false;
      });
      this.filtrosAtivos = { cor: [], tamanho: [], preco: [] };
      this.carregarMais = false;
      this.construirPrateleira();
      document.querySelector("#filters")?.classList.remove("show");
      
      const verMaisBtn = document.querySelector(".verMaisTamanhos") as HTMLElement;
      const checkboxGrid = document.querySelector(".filterSizes .checkbox-grid") as HTMLElement;
      if (verMaisBtn && checkboxGrid) {
        const alturaOriginal = checkboxGrid.scrollHeight;
        if (alturaOriginal > 180) {
          checkboxGrid.style.maxHeight = "180px";
          checkboxGrid.style.overflow = "hidden";
          verMaisBtn.textContent = "Ver mais tamanhos";
          verMaisBtn.dataset.expandido = "false";
          verMaisBtn.style.display = "block";
        }
      }
    });
  }

  private configurarEventosOrdenacao(): void {
    const orderByContainer = document.querySelector(".orderBy");
    const opcoesContainer = orderByContainer?.querySelector(".options");
    
    orderByContainer?.addEventListener("click", (evento) => {
      evento.stopPropagation();
      
      if (window.innerWidth >= 1280) {
        opcoesContainer?.classList.toggle("show");
      }
    });

    document.addEventListener("click", (evento) => {
      if (!orderByContainer?.contains(evento.target as Node)) {
        opcoesContainer?.classList.remove("show");
      }
    });

    const opcoesOrdenacao = [
      { id: "#orderByRecent", valor: "recentes" },
      { id: "#orderByCheapest", valor: "menorpreco" },
      { id: "#orderByExpensive", valor: "maiorpreco" }
    ];

    opcoesOrdenacao.forEach(({ id, valor }) => {
      document.querySelector(id)?.addEventListener("click", (evento) => {
        evento.stopPropagation();
        this.ordenacaoSelecionada = valor;
        
        if (window.innerWidth >= 1280) {
          opcoesContainer?.classList.remove("show");
        } else {
          document.querySelector(".orderBy")?.classList.remove("show");
        }
        
        this.construirPrateleira();
      });
    });
  }

  private configurarEventosMinicarrinho(): void {
    document.querySelector("#minicartContainer")?.addEventListener("click", () => {
      this.abrirMinicarrinho();
    });

    document.querySelector(".closeMinicart")?.addEventListener("click", () => {
      document.querySelector('.minicartShelfContainer')?.classList.remove("active");
    });

    document.querySelector(".minicartShelfContainer")?.addEventListener("click", (evento) => {
      const alvo = evento.target as HTMLElement;
      
      if (alvo.classList.contains("minicartShelfContainer")) {
        document.querySelector('.minicartShelfContainer')?.classList.remove("active");
      }
    });
  }

  private configurarEventosMobile(): void {
    document.querySelector("#loadMore")?.addEventListener("click", () => {
      this.carregarMais = true;
      this.construirPrateleira();
    });

    document.querySelector("#filterButton")?.addEventListener("click", () => {
      const filtersElement = document.querySelector("#filters");
      filtersElement?.classList.add("show");
      
      document.body.style.overflow = "hidden";
    });

    document.querySelector(".closeFilters")?.addEventListener("click", () => {
      this.fecharFiltrosMobile();
    });

    document.querySelector("#applyFilter")?.addEventListener("click", () => {
      this.fecharFiltrosMobile();
    });

    document.querySelector("#orderButton")?.addEventListener("click", () => {
      document.querySelector(".orderBy")?.classList.add("show");
      document.body.style.overflow = "hidden";
    });

    document.querySelector("#closeOrder")?.addEventListener("click", () => {
      document.querySelector(".orderBy")?.classList.remove("show");
      document.body.style.overflow = "auto";
    });

    document.querySelectorAll(".filterTitle").forEach(item => {
      item.addEventListener("click", () => {
        const wasExpanded = item.classList.contains("show");
        
        item.classList.toggle("show");
        
        if (!wasExpanded && item.classList.contains("show")) {
          this.animarElementosDoFiltro(item);
        }
      });
    });
  }

  private fecharFiltrosMobile(): void {
    const filtersElement = document.querySelector("#filters");
    filtersElement?.classList.remove("show");
    
    document.body.style.overflow = "auto";
    
    document.querySelectorAll(".filterTitle").forEach(item => {
      item.classList.remove("show");
    });
  }

  private animarElementosDoFiltro(filterTitle: Element): void {
    const filterContainer = filterTitle.nextElementSibling;
    if (!filterContainer) return;
    
    const elementos = filterContainer.querySelectorAll('.colorContainer, .checkbox-grid > div');
    elementos.forEach((elemento, index) => {
      (elemento as HTMLElement).style.animation = 'none';
      (elemento as HTMLElement).offsetHeight;
      (elemento as HTMLElement).style.animation = `slideInFadeIn 0.3s ease forwards`;
      (elemento as HTMLElement).style.animationDelay = `${index * 0.05}s`;
    });
  }

}

function main() {
  console.log(urlServidor);
}

let gerenciadorProdutos: GerenciadorProdutos;

function build() {
  gerenciadorProdutos = new GerenciadorProdutos();
}

function handleFormChange() {
}

(window as any).build = build;
(window as any).handleFormChange = handleFormChange;

document.addEventListener("DOMContentLoaded", main);