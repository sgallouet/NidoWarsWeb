import { duneSettlerArt } from "../content/units/dune-settler/art.js";

export class BuilderQuestionDock {
  constructor(root, { onSelect }) {
    this.node = root.querySelector('[data-ui="builder-question-dock"]');
    this.onSelect = onSelect;
    this.stateKey = "";
  }

  render(proposals) {
    if (!this.node) {
      return;
    }

    const key = proposals.map((proposal) => `${proposal.id}:${proposal.unit.id}:${proposal.tile.id}`).join("|");

    if (key === this.stateKey) {
      return;
    }

    this.stateKey = key;
    this.node.hidden = proposals.length === 0;
    this.node.innerHTML = "";

    for (const proposal of proposals) {
      const button = document.createElement("button");

      button.className = "builder-question-button";
      button.type = "button";
      button.dataset.proposalId = proposal.id;
      button.ariaLabel = `${proposal.unit.name} has a building question`;
      button.innerHTML = `
        <img src="${duneSettlerArt.questionPortrait}" alt="" />
        <span aria-hidden="true">?</span>
      `;
      button.addEventListener("click", () => this.onSelect(proposal.id));
      this.node.append(button);
    }
  }
}
