import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { CensusRecord, FamilyTree, FamilyTreeLink, FamilyTreeNode } from '../core/models';
import { PageSizeSelectComponent } from '../shared/page-size-select.component';
import { TablePaginationComponent } from '../shared/table-pagination.component';

type PositionedNode = FamilyTreeNode & { x: number; y: number };
type NodePositions = Record<string, { x: number; y: number }>;
type LinkOffsets = Record<string, { dx: number; dy: number }>;

@Component({
  selector: 'acl-family-tree-page',
  imports: [FormsModule, PageSizeSelectComponent, TablePaginationComponent],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{{ i18n.t('familyTree.title') }}</h1>
          <p>{{ i18n.t('familyTree.subtitle') }}</p>
        </div>
        <div class="field selector">
          <label for="person">{{ i18n.t('familyTree.centralPerson') }}</label>
          <select id="person" name="person" [ngModel]="selectedPersonId()" (ngModelChange)="selectPerson($event)">
            @for (person of persons(); track person.id) {
              <option [value]="person.id">{{ person.first_name }} {{ person.last_name }}</option>
            }
          </select>
        </div>
        <div class="field depth-selector">
          <label for="depth">{{ i18n.t('familyTree.graphDepth') }}</label>
          <select id="depth" name="depth" [ngModel]="depth()" (ngModelChange)="setDepth($event)">
            @for (option of depthOptions; track option) {
              <option [ngValue]="option">{{ option }}</option>
            }
          </select>
        </div>
      </header>

      @if (tree(); as family) {
        <section class="workspace">
          <article class="graph-panel">
            <div class="toolbar">
              <div class="tool-group">
                <button type="button" [title]="i18n.t('familyTree.zoomOut')" (click)="zoomBy(0.85)">
                  <span class="material-symbols-outlined">remove</span>
                </button>
                <button type="button" [title]="i18n.t('familyTree.recenter')" (click)="resetView()">
                  <span class="material-symbols-outlined">center_focus_strong</span>
                </button>
                <button type="button" [title]="i18n.t('familyTree.resetLayout')" (click)="resetLayout()">
                  <span class="material-symbols-outlined">rebase_edit</span>
                </button>
                <button type="button" [title]="i18n.t('familyTree.zoomIn')" (click)="zoomBy(1.15)">
                  <span class="material-symbols-outlined">add</span>
                </button>
              </div>
              <div class="legend" [attr.aria-label]="i18n.t('familyTree.relationsLegend')">
                <span><i class="legend-line parent-child"></i>{{ i18n.t('familyTree.relation.parentChild') }}</span>
                <span><i class="legend-line spouse"></i>{{ i18n.t('familyTree.relation.spouse') }}</span>
                <span><i class="legend-line guardian"></i>{{ i18n.t('familyTree.relation.guardian') }}</span>
              </div>
              <span class="zoom-label">{{ zoomPercent() }}%</span>
            </div>

            <svg
              class="family-graph"
              viewBox="0 0 1100 620"
              role="img"
              aria-label="Graphe interactif des relations familiales"
              (wheel)="onWheel($event)"
              (pointerdown)="startPan($event)"
              (pointermove)="movePan($event)"
              (pointerup)="endInteraction($event)"
              (pointercancel)="endInteraction($event)"
              (pointerleave)="endPan()"
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path>
                </marker>
              </defs>

              <g [attr.transform]="transform()">
                @for (link of visibleLinks(); track link.id) {
                  @if (nodeById(link.source); as source) {
                    @if (nodeById(link.target); as target) {
                      <path
                        class="edge"
                        [class.active]="isSelectedLink(link)"
                        [class.parent-child]="link.category === 'parent_child'"
                        [class.spouse]="link.category === 'spouse'"
                        [class.guardian]="link.category === 'guardian'"
                        [class.dragging]="draggedLinkId() === link.id"
                        [attr.d]="edgePath(link, source, target)"
                        (pointerdown)="startLinkDrag(link, $event)"
                        marker-end="url(#arrow)"
                      ></path>
                    }
                  }
                }

                @for (node of layoutNodes(); track node.id) {
                  <g
                    class="node"
                    [class.root]="node.group === 'root'"
                    [class.selected]="selectedNode()?.id === node.id"
                    [class.dragging]="draggedNodeId() === node.id"
                    [attr.transform]="'translate(' + node.x + ' ' + node.y + ')'"
                    (pointerdown)="selectNode(node, $event)"
                    (dblclick)="selectPerson(node.id)"
                    tabindex="0"
                    role="button"
                  >
                    <rect x="-86" y="-42" width="172" height="84" rx="8"></rect>
                    <circle cx="-62" cy="-14" r="15"></circle>
                    <text class="node-icon" x="-62" y="-8">{{ iconGlyph(node) }}</text>
                    <text class="node-title" x="-38" y="-12">{{ node.label }}</text>
                    <text class="node-meta" x="-38" y="12">{{ nodeMeta(node) }}</text>
                    <text class="node-group" x="-76" y="31">{{ labelGroup(node.group) }}</text>
                  </g>
                }

                @for (link of visibleLinks(); track link.id + '-label') {
                  @if (nodeById(link.source); as source) {
                    @if (nodeById(link.target); as target) {
                      <g class="edge-label-wrap" [attr.transform]="edgeLabelTransform(link, source, target)">
                        <text class="edge-label" text-anchor="middle" dominant-baseline="middle">
                          {{ shortRelation(link.type) }}
                        </text>
                      </g>
                    }
                  }
                }
              </g>
            </svg>
          </article>

          <aside class="details card">
            @if (selectedNode(); as node) {
              <span class="chip {{ node.validation_status }}">{{ node.validation_status }}</span>
              <h2>{{ node.label }}</h2>
              <p>{{ labelGroup(node.group) }} · {{ nodeMeta(node) }}</p>
              <div class="detail-actions">
                <button class="btn primary" type="button" (click)="selectPerson(node.id)">
                  <span class="material-symbols-outlined">account_tree</span>
                  {{ i18n.t('familyTree.setAsCenter') }}
                </button>
                <button class="btn secondary" type="button" (click)="focusNode(node.id)">
                  <span class="material-symbols-outlined">my_location</span>
                  {{ i18n.t('familyTree.focus') }}
                </button>
              </div>
              <h3>{{ i18n.t('familyTree.directRelations') }}</h3>
              <div class="relation-list">
                @for (link of linksFor(node.id); track link.id) {
                  <button type="button" (click)="selectLinkedNode(link, node.id)">
                    <strong>{{ shortRelation(link.type) }}</strong>
                    <span>{{ labelFor(otherNodeId(link, node.id)) }}</span>
                  </button>
                }
                @if (!linksFor(node.id).length) {
                  <span class="empty">{{ i18n.t('familyTree.noDirectLink') }}</span>
                }
              </div>
            }
          </aside>
        </section>

        <article class="card">
          <h2>{{ i18n.t('familyTree.familyLinks') }}</h2>
          <div class="table-controls" aria-label="Filtres des liens familiaux">
            <div class="field">
              <label for="relationSearch">{{ i18n.t('familyTree.search') }}</label>
              <input id="relationSearch" name="relationSearch" type="search" [ngModel]="relationSearch()" (ngModelChange)="setRelationSearch($event)" [placeholder]="i18n.t('familyTree.search.placeholder')" />
            </div>
            <div class="field">
              <label for="relationCategory">{{ i18n.t('familyTree.category') }}</label>
              <select id="relationCategory" name="relationCategory" [ngModel]="relationCategoryFilter()" (ngModelChange)="setRelationCategoryFilter($event)">
                <option value="">{{ i18n.t('familyTree.all') }}</option>
                <option value="parent_child">{{ i18n.t('familyTree.relation.parentChild') }}</option>
                <option value="spouse">{{ i18n.t('familyTree.relation.spouse') }}</option>
                <option value="guardian">{{ i18n.t('familyTree.relation.guardian') }}</option>
                <option value="other">{{ i18n.t('familyTree.relation.other') }}</option>
              </select>
            </div>
            <acl-page-size-select controlId="relationPageSize" [value]="relationPageSize()" [options]="pageSizes" (valueChange)="setRelationPageSize($event)" />
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>{{ i18n.t('familyTree.table.source') }}</th><th>{{ i18n.t('familyTree.table.relation') }}</th><th>{{ i18n.t('familyTree.category') }}</th><th>{{ i18n.t('familyTree.table.target') }}</th><th>{{ i18n.t('familyTree.table.status') }}</th></tr></thead>
              <tbody>
                @for (link of pagedRelationLinks(); track link.id) {
                  <tr [class.selected-row]="isSelectedLink(link)">
                    <td>{{ labelFor(link.source) }}</td>
                    <td><strong>{{ link.type }}</strong></td>
                    <td><span class="relation-chip {{ link.category }}">{{ labelCategory(link.category) }}</span></td>
                    <td>{{ labelFor(link.target) }}</td>
                    <td><span class="chip {{ link.status }}">{{ link.status }}</span></td>
                  </tr>
                }
                @if (!pagedRelationLinks().length) {
                  <tr><td colspan="5" class="empty-cell">{{ i18n.t('familyTree.emptyLinks') }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <acl-table-pagination
            ariaLabel="Pagination des liens familiaux"
            [totalItems]="filteredRelationLinks().length"
            [page]="relationPage()"
            [totalPages]="relationTotalPages()"
            (previous)="previousRelationPage()"
            (next)="nextRelationPage()"
          />
        </article>
      }
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 24px; }
    .page-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
    h1 { margin: 0; font-size: 40px; line-height: 48px; }
    h2 { margin: 10px 0 6px; font-size: 24px; }
    h3 { margin: 24px 0 10px; font-size: 16px; }
    p { margin: 4px 0 0; color: var(--muted); }
    .selector { min-width: 280px; }
    .depth-selector { min-width: 170px; }
    .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: stretch; }
    .graph-panel {
      min-height: 680px; background: var(--surface); border: 2px solid var(--outline-soft);
      border-radius: 8px; overflow: hidden; display: grid; grid-template-rows: auto 1fr;
    }
    .toolbar {
      height: 56px; padding: 6px 10px; border-bottom: 2px solid var(--outline-soft);
      display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--surface);
    }
    .tool-group { display: flex; gap: 6px; }
    .toolbar button {
      width: 44px; height: 44px; border: 1px solid var(--outline-soft); border-radius: 6px;
      background: var(--surface); color: var(--primary); display: grid; place-items: center;
    }
    .legend { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12px; color: var(--muted); font-size: 12px; font-weight: 800; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .legend-line { width: 28px; height: 0; border-top: 3px solid var(--primary); display: inline-block; }
    .legend-line.spouse { border-color: var(--terracotta); border-top-style: dashed; }
    .legend-line.guardian { border-color: var(--growth); border-top-style: dotted; }
    .zoom-label { color: var(--muted); font-size: 14px; font-weight: 700; }
    .family-graph {
      width: 100%; min-height: 620px; background:
        linear-gradient(var(--surface-container) 1px, transparent 1px),
        linear-gradient(90deg, var(--surface-container) 1px, transparent 1px),
        var(--sand-bg);
      background-size: 32px 32px; touch-action: none; cursor: grab;
    }
    .family-graph:active { cursor: grabbing; }
    .edge { fill: none; stroke: var(--outline); stroke-width: 2.5; opacity: .8; cursor: grab; pointer-events: stroke; }
    .edge.parent-child { stroke: var(--primary); stroke-width: 3; }
    .edge.spouse { stroke: var(--terracotta); stroke-dasharray: 8 6; }
    .edge.guardian { stroke: var(--growth); stroke-dasharray: 4 5; }
    .edge.active { stroke: var(--terracotta); stroke-width: 4; opacity: 1; }
    .edge.dragging { cursor: grabbing; opacity: 1; stroke-width: 5; }
    .edge-label-wrap { pointer-events: none; }
    .edge-label {
      fill: var(--ink); font-size: 13px; font-weight: 900;
      paint-order: stroke; stroke: var(--sand-bg); stroke-width: 8; stroke-linejoin: round;
    }
    .node { cursor: grab; outline: none; }
    .node.dragging { cursor: grabbing; }
    .node.dragging rect { filter: drop-shadow(0 14px 20px rgba(15, 23, 42, .22)); }
    .node rect { fill: var(--surface); stroke: var(--outline-soft); stroke-width: 2; }
    .node circle { fill: var(--primary-soft); stroke: var(--primary); stroke-width: 2; }
    .node.root rect { fill: var(--primary-soft); stroke: var(--primary); stroke-width: 3; }
    .node.selected rect { stroke: var(--terracotta); stroke-width: 4; }
    .node-title { fill: var(--ink); font-size: 14px; font-weight: 800; }
    .node-meta { fill: var(--muted); font-size: 12px; }
    .node-group { fill: var(--muted); font-size: 11px; font-weight: 800; }
    .node-icon { fill: var(--primary); font-family: Inter, Arial, sans-serif; font-size: 16px; font-weight: 800; text-anchor: middle; }
    .details { min-height: 680px; align-content: start; }
    .detail-actions { display: grid; gap: 10px; margin: 20px 0; }
    .relation-list { display: grid; gap: 10px; }
    .relation-list button {
      min-height: 58px; border: 2px solid var(--outline-soft); border-radius: 6px; background: var(--surface);
      padding: 10px; display: grid; gap: 4px; text-align: left;
    }
    .relation-list span { color: var(--muted); }
    .empty {
      min-height: 64px; display: grid; place-items: center; color: var(--muted); border: 2px dashed var(--outline-soft);
      border-radius: 8px; padding: 0 16px;
    }
    .selected-row { background: var(--terracotta-soft); }
    .relation-chip {
      display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 999px;
      font-size: 12px; font-weight: 900; border: 1px solid var(--outline-soft); color: var(--ink); background: var(--surface-container);
    }
    .relation-chip.parent_child { color: var(--primary); background: var(--primary-soft); }
    .relation-chip.spouse { color: var(--terracotta); background: var(--terracotta-soft); }
    .relation-chip.guardian { color: var(--growth); background: var(--surface-container); }
    .table-controls { grid-template-columns: minmax(220px, 1fr) 190px 130px; }
    @media(max-width: 1100px) {
      .workspace { grid-template-columns: 1fr; }
      .details { min-height: auto; }
    }
    @media(max-width: 900px) {
      .page { padding: 24px 16px; }
      .page-head { align-items: start; flex-direction: column; }
      h1 { font-size: 32px; line-height: 40px; }
      .selector, .depth-selector { width: 100%; min-width: 0; }
      .toolbar { height: auto; min-height: 56px; align-items: flex-start; flex-wrap: wrap; }
      .legend { justify-content: flex-start; order: 3; width: 100%; }
      .graph-panel { min-height: 560px; }
      .family-graph { min-height: 500px; }
    }
  `,
})
export class FamilyTreePageComponent implements OnInit {
  readonly persons = signal<CensusRecord[]>([]);
  readonly selectedPersonId = signal('');
  readonly tree = signal<FamilyTree | null>(null);
  readonly selectedNode = signal<PositionedNode | null>(null);
  readonly scale = signal(1);
  readonly translateX = signal(0);
  readonly translateY = signal(0);
  readonly manualPositions = signal<NodePositions>({});
  readonly manualLinkOffsets = signal<LinkOffsets>({});
  readonly draggedNodeId = signal<string | null>(null);
  readonly draggedLinkId = signal<string | null>(null);
  readonly depth = signal(2);
  readonly depthOptions = [0, 1, 2, 3, 4, 5, 6];
  readonly pageSizes = [5, 10, 20, 50];
  readonly relationSearch = signal('');
  readonly relationCategoryFilter = signal('');
  readonly relationPage = signal(1);
  readonly relationPageSize = signal(10);
  readonly filteredRelationLinks = computed(() => {
    const query = this.relationSearch().trim().toLowerCase();
    const category = this.relationCategoryFilter();
    return (this.tree()?.links || []).filter((link) => {
      const matchesCategory = !category || link.category === category;
      const searchable = `${this.labelFor(link.source)} ${this.labelFor(link.target)} ${link.type} ${this.labelCategory(link.category)} ${link.status || ''}`.toLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });
  });
  readonly relationTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredRelationLinks().length / this.relationPageSize())));
  readonly pagedRelationLinks = computed(() => {
    const start = (Math.min(this.relationPage(), this.relationTotalPages()) - 1) * this.relationPageSize();
    return this.filteredRelationLinks().slice(start, start + this.relationPageSize());
  });
  private panStart: { x: number; y: number; tx: number; ty: number } | null = null;
  private nodeDragStart: { id: string; offsetX: number; offsetY: number } | null = null;
  private linkDragStart: { id: string; offsetX: number; offsetY: number } | null = null;

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.persons().subscribe({
      next: (persons) => {
        this.persons.set(persons);
        if (persons.length) {
          this.selectPerson(persons[0].id);
        }
      },
      error: () => this.persons.set([]),
    });
  }

  selectPerson(personId: string): void {
    if (!personId) {
      return;
    }
    this.selectedPersonId.set(personId);
    this.api.familyTree(personId, this.depth()).subscribe({
      next: (tree) => {
        this.tree.set(tree);
        this.manualPositions.set({});
        this.manualLinkOffsets.set({});
        this.relationPage.set(1);
        this.resetView();
        this.selectedNode.set(this.layoutNodes().find((node) => node.id === tree.root.id) || null);
      },
      error: () => {
        this.tree.set(null);
        this.selectedNode.set(null);
      },
    });
  }

  setRelationSearch(value: string): void {
    this.relationSearch.set(value);
    this.relationPage.set(1);
  }

  setRelationCategoryFilter(value: string): void {
    this.relationCategoryFilter.set(value);
    this.relationPage.set(1);
  }

  setRelationPageSize(value: number | string): void {
    this.relationPageSize.set(Number(value));
    this.relationPage.set(1);
  }

  previousRelationPage(): void {
    this.relationPage.set(Math.max(1, this.relationPage() - 1));
  }

  nextRelationPage(): void {
    this.relationPage.set(Math.min(this.relationTotalPages(), this.relationPage() + 1));
  }

  setDepth(value: number | string): void {
    const nextDepth = Math.min(6, Math.max(0, Number(value)));
    this.depth.set(Number.isNaN(nextDepth) ? 2 : nextDepth);
    if (this.selectedPersonId()) {
      this.selectPerson(this.selectedPersonId());
    }
  }

  layoutNodes(): PositionedNode[] {
    const tree = this.tree();
    if (!tree) {
      return [];
    }
    const groups: Array<{ name: FamilyTreeNode['group']; y: number; fallback: FamilyTreeNode[] }> = [
      { name: 'parent', y: 90, fallback: [] },
      { name: 'sibling', y: 255, fallback: [] },
      { name: 'spouse', y: 255, fallback: [] },
      { name: 'root', y: 255, fallback: [tree.root] },
      { name: 'child', y: 440, fallback: [] },
      { name: 'relative', y: 545, fallback: [] },
    ];
    const nodes: PositionedNode[] = [];
    for (const group of groups) {
      const source = tree.nodes.filter((node) => node.group === group.name);
      const row = source.length ? source : group.fallback;
      const centered = this.centerRow(row, group.y);
      nodes.push(...centered);
    }
    const positions = this.manualPositions();
    return this.uniqueNodes(nodes).map((node) => {
      const manual = positions[node.id];
      return manual ? { ...node, x: manual.x, y: manual.y } : node;
    });
  }

  visibleLinks(): FamilyTreeLink[] {
    const ids = new Set(this.layoutNodes().map((node) => node.id));
    return this.tree()?.links.filter((link) => ids.has(link.source) && ids.has(link.target)) || [];
  }

  nodeById(id: string): PositionedNode | undefined {
    return this.layoutNodes().find((node) => node.id === id);
  }

  selectNode(node: PositionedNode, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedNode.set(node);
    this.startNodeDrag(node, event);
  }

  selectLinkedNode(link: FamilyTreeLink, currentId: string): void {
    const next = this.nodeById(this.otherNodeId(link, currentId));
    if (next) {
      this.selectedNode.set(next);
      this.focusNode(next.id);
    }
  }

  focusNode(nodeId: string): void {
    const node = this.nodeById(nodeId);
    if (!node) {
      return;
    }
    this.translateX.set(550 - node.x * this.scale());
    this.translateY.set(310 - node.y * this.scale());
  }

  resetView(): void {
    this.scale.set(1);
    this.translateX.set(0);
    this.translateY.set(0);
  }

  resetLayout(): void {
    this.manualPositions.set({});
    this.manualLinkOffsets.set({});
    const selectedId = this.selectedNode()?.id;
    if (selectedId) {
      this.selectedNode.set(this.nodeById(selectedId) || null);
    }
  }

  zoomBy(factor: number): void {
    this.scale.set(this.clampScale(this.scale() * factor));
  }

  zoomPercent(): number {
    return Math.round(this.scale() * 100);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomBy(event.deltaY > 0 ? 0.92 : 1.08);
  }

  startPan(event: PointerEvent): void {
    if (this.nodeDragStart || this.linkDragStart) {
      return;
    }
    this.panStart = { x: event.clientX, y: event.clientY, tx: this.translateX(), ty: this.translateY() };
  }

  movePan(event: PointerEvent): void {
    if (this.nodeDragStart) {
      this.moveNode(event);
      return;
    }
    if (this.linkDragStart) {
      this.moveLink(event);
      return;
    }
    if (!this.panStart) {
      return;
    }
    this.translateX.set(this.panStart.tx + event.clientX - this.panStart.x);
    this.translateY.set(this.panStart.ty + event.clientY - this.panStart.y);
  }

  endPan(): void {
    this.panStart = null;
  }

  endInteraction(event: PointerEvent): void {
    this.releasePointer(event);
    this.nodeDragStart = null;
    this.linkDragStart = null;
    this.draggedNodeId.set(null);
    this.draggedLinkId.set(null);
    this.endPan();
  }

  transform(): string {
    return `translate(${this.translateX()} ${this.translateY()}) scale(${this.scale()})`;
  }

  edgePath(link: FamilyTreeLink, source: PositionedNode, target: PositionedNode): string {
    const control = this.edgeControlPoint(link, source, target);
    return `M ${source.x} ${source.y + 42} C ${source.x + control.dx} ${control.y}, ${target.x + control.dx} ${control.y}, ${target.x} ${target.y - 42}`;
  }

  edgeLabelTransform(link: FamilyTreeLink, source: PositionedNode, target: PositionedNode): string {
    const control = this.edgeControlPoint(link, source, target);
    const x = control.x;
    const y = control.y - 16 / this.scale();
    const inverseScale = 1 / this.scale();
    return `translate(${x} ${y}) scale(${inverseScale})`;
  }

  linksFor(nodeId: string): FamilyTreeLink[] {
    return this.tree()?.links.filter((link) => link.source === nodeId || link.target === nodeId) || [];
  }

  isSelectedLink(link: FamilyTreeLink): boolean {
    const selected = this.selectedNode();
    return Boolean(selected && (link.source === selected.id || link.target === selected.id));
  }

  otherNodeId(link: FamilyTreeLink, currentId: string): string {
    return link.source === currentId ? link.target : link.source;
  }

  labelFor(personId: string): string {
    return this.nodeById(personId)?.label || personId;
  }

  iconGlyph(node: FamilyTreeNode): string {
    if (node.group === 'child') return 'E';
    if (node.group === 'spouse') return 'C';
    if (node.group === 'parent') return 'P';
    if (node.group === 'sibling') return 'F';
    return '●';
  }

  nodeMeta(node: FamilyTreeNode): string {
    return node.birth_date || (node.estimated_age ? `${node.estimated_age} ${this.i18n.t('familyTree.years')}` : this.i18n.t('familyTree.ageUnknown'));
  }

  shortRelation(type: string): string {
    return this.i18n.t(('familyTree.rel.' + type) as any) || type;
  }

  labelCategory(category: FamilyTreeLink['category']): string {
    return {
      parent_child: this.i18n.t('familyTree.relation.parentChild'),
      spouse: this.i18n.t('familyTree.relation.spouse'),
      guardian: this.i18n.t('familyTree.relation.guardian'),
      other: this.i18n.t('familyTree.relation.other'),
    }[category];
  }

  labelGroup(group: FamilyTreeNode['group']): string {
    return {
      root: this.i18n.t('familyTree.group.root'),
      parent: this.i18n.t('familyTree.group.parent'),
      spouse: this.i18n.t('familyTree.group.spouse'),
      child: this.i18n.t('familyTree.group.child'),
      sibling: this.i18n.t('familyTree.group.sibling'),
      relative: this.i18n.t('familyTree.group.relative'),
    }[group];
  }

  private centerRow(nodes: FamilyTreeNode[], y: number): PositionedNode[] {
    const gap = 210;
    const startX = 550 - ((nodes.length - 1) * gap) / 2;
    return nodes.map((node, index) => ({ ...node, x: startX + index * gap, y }));
  }

  private uniqueNodes(nodes: PositionedNode[]): PositionedNode[] {
    const seen = new Set<string>();
    return nodes.filter((node) => {
      if (seen.has(node.id)) {
        return false;
      }
      seen.add(node.id);
      return true;
    });
  }

  private clampScale(value: number): number {
    return Math.min(2.2, Math.max(0.45, value));
  }

  private startNodeDrag(node: PositionedNode, event: PointerEvent): void {
    const point = this.graphPointFromEvent(event);
    if (!point) {
      return;
    }
    this.capturePointer(event);
    this.panStart = null;
    this.nodeDragStart = {
      id: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    };
    this.draggedNodeId.set(node.id);
  }

  private moveNode(event: PointerEvent): void {
    if (!this.nodeDragStart) {
      return;
    }
    event.preventDefault();
    const point = this.graphPointFromEvent(event);
    if (!point) {
      return;
    }
    const next = {
      x: point.x - this.nodeDragStart.offsetX,
      y: point.y - this.nodeDragStart.offsetY,
    };
    this.manualPositions.update((positions) => ({
      ...positions,
      [this.nodeDragStart!.id]: next,
    }));
    const selected = this.selectedNode();
    if (selected?.id === this.nodeDragStart.id) {
      this.selectedNode.set({ ...selected, ...next });
    }
  }

  startLinkDrag(link: FamilyTreeLink, event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const source = this.nodeById(link.source);
    const target = this.nodeById(link.target);
    const point = this.graphPointFromEvent(event);
    if (!source || !target || !point) {
      return;
    }
    const control = this.edgeControlPoint(link, source, target);
    this.capturePointer(event);
    this.panStart = null;
    this.linkDragStart = {
      id: link.id,
      offsetX: point.x - control.x,
      offsetY: point.y - control.y,
    };
    this.draggedLinkId.set(link.id);
  }

  private moveLink(event: PointerEvent): void {
    if (!this.linkDragStart) {
      return;
    }
    event.preventDefault();
    const link = this.visibleLinks().find((item) => item.id === this.linkDragStart?.id);
    const point = this.graphPointFromEvent(event);
    if (!link || !point) {
      return;
    }
    const source = this.nodeById(link.source);
    const target = this.nodeById(link.target);
    if (!source || !target) {
      return;
    }
    const base = this.edgeBasePoint(source, target);
    const nextControl = {
      x: point.x - this.linkDragStart.offsetX,
      y: point.y - this.linkDragStart.offsetY,
    };
    this.manualLinkOffsets.update((offsets) => ({
      ...offsets,
      [link.id]: {
        dx: nextControl.x - base.x,
        dy: nextControl.y - base.y,
      },
    }));
  }

  private graphPointFromEvent(event: PointerEvent): { x: number; y: number } | null {
    const svg = this.svgFromEvent(event);
    if (!svg) {
      return null;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return null;
    }
    const svgPoint = point.matrixTransform(matrix.inverse());
    return {
      x: (svgPoint.x - this.translateX()) / this.scale(),
      y: (svgPoint.y - this.translateY()) / this.scale(),
    };
  }

  private svgFromEvent(event: PointerEvent): SVGSVGElement | null {
    const target = event.currentTarget as SVGElement | null;
    if (!target) {
      return null;
    }
    if (target instanceof SVGSVGElement) {
      return target;
    }
    return target.ownerSVGElement;
  }

  private capturePointer(event: PointerEvent): void {
    const target = event.currentTarget as Element | null;
    if (target?.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }
  }

  private releasePointer(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (target?.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  private edgeBasePoint(source: PositionedNode, target: PositionedNode): { x: number; y: number } {
    return {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    };
  }

  private edgeControlPoint(
    link: FamilyTreeLink,
    source: PositionedNode,
    target: PositionedNode,
  ): { x: number; y: number; dx: number; dy: number } {
    const base = this.edgeBasePoint(source, target);
    const offset = this.manualLinkOffsets()[link.id] || { dx: 0, dy: 0 };
    return {
      x: base.x + offset.dx,
      y: base.y + offset.dy,
      dx: offset.dx,
      dy: offset.dy,
    };
  }
}
