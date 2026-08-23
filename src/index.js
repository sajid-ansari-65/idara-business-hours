import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './style.scss';
import './editor.scss';

/**
 * Outlined clock with a filled status dot — a nod to the live "Open now" pill
 * this block is built around.
 *
 * block.json can only name a Dashicon, so the custom mark is supplied here;
 * `clock` stays in block.json as the fallback for anything that reads the
 * metadata without running the editor script (the block directory listing,
 * for example). It draws in `currentColor` so it picks up the editor UI
 * colour — including the selected and dark-toolbar states — like a core block.
 */
const icon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		stroke="currentColor"
		strokeWidth="1.6"
		strokeLinecap="round"
		aria-hidden="true"
		focusable="false"
	>
		{ /* The editor sets `fill: currentColor` on block-icon SVGs, and that
		     stylesheet beats a `fill` attribute on the <svg> itself — so the
		     stroked shapes have to opt out of the fill one by one, or the
		     whole mark renders as a solid blob. */ }
		<path d="M20.6 10.4A8.8 8.8 0 1 0 13.6 20.6" fill="none" />
		<path d="M12 6.8V12l3.3 2" fill="none" />
		<circle cx="18.4" cy="17.6" r="3.2" fill="currentColor" stroke="none" />
	</svg>
);

registerBlockType( metadata.name, {
	icon,
	edit: Edit,
	save: () => null,
} );
