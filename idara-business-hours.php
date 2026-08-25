<?php
/**
 * Plugin Name:       Idara Business Hours
 * Plugin URI:        https://idara.studio/plugins/business-hours
 * Description:       A lightweight Gutenberg block that displays weekly business hours with a live "Open now" status and optional LocalBusiness schema. FSE-ready, no bloat, loads only where used.
 * Version:           1.0.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Mohammad Sajid Ansari
 * Author URI:        https://idara.studio
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       idara-business-hours
 *
 * @package Idara\BusinessHours
 */

defined( 'ABSPATH' ) || exit;

define( 'IDARA_BUSINESS_HOURS_VERSION', '1.0.0' );
define( 'IDARA_BUSINESS_HOURS_PATH', plugin_dir_path( __FILE__ ) );

/**
 * Register the block and enable JS translations for the editor script.
 *
 * register_block_type() reads build/block.json and wires up:
 *  - editorScript / editorStyle  (admin only)
 *  - viewScriptModule            (frontend, Interactivity API, only on pages with this block)
 *  - style                       (frontend + editor)
 *  - render callback
 */
function idara_business_hours_init(): void {
	register_block_type( IDARA_BUSINESS_HOURS_PATH . 'build' );

	wp_set_script_translations(
		'idara-business-hours-editor-script',
		'idara-business-hours',
		IDARA_BUSINESS_HOURS_PATH . 'languages'
	);
}
add_action( 'init', 'idara_business_hours_init' );
