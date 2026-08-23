<?php
/**
 * Server-side render for the Business Hours block (v1.0.0).
 *
 * @package Idara\BusinessHours
 *
 * @var array    $attributes  Block attributes.
 * @var string   $content     Block inner content (unused, void block).
 * @var WP_Block $block       Block instance.
 */

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// Reason: this file is require()'d inside WordPress's block render closure — all
// variables here are local to that closure, not in global scope.

/* ── Helpers (guarded: render.php is require()'d once per block instance) ── */
if ( ! function_exists( 'idara_business_hours_valid_time' ) ) {
	/**
	 * Validate a 24-hour "HH:MM" time string. Returns the normalised string or ''.
	 */
	function idara_business_hours_valid_time( $time ): string {
		$time = is_string( $time ) ? trim( $time ) : '';
		return preg_match( '/^([01][0-9]|2[0-3]):[0-5][0-9]$/', $time ) ? $time : '';
	}

	/**
	 * Format a validated "HH:MM" string for display, localised (AM/PM via date_i18n).
	 */
	function idara_business_hours_format_time( string $time, string $format ): string {
		$parts = explode( ':', $time );
		$ts    = mktime( (int) $parts[0], (int) $parts[1], 0, 1, 1, 2000 );
		return date_i18n( '24' === $format ? 'H:i' : 'g:i A', $ts );
	}

	/**
	 * Minutes since midnight for a validated "HH:MM" string.
	 */
	function idara_business_hours_to_minutes( string $time ): int {
		$parts = explode( ':', $time );
		return ( (int) $parts[0] ) * 60 + (int) $parts[1];
	}

	/**
	 * Sanitise a single day's slot list into [ [open, close, openFmt, closeFmt], ... ].
	 */
	function idara_business_hours_clean_slots( $slots, string $format ): array {
		$clean = array();
		if ( ! is_array( $slots ) ) {
			return $clean;
		}
		foreach ( $slots as $slot ) {
			$open  = idara_business_hours_valid_time( $slot['open'] ?? '' );
			$close = idara_business_hours_valid_time( $slot['close'] ?? '' );
			if ( '' === $open || '' === $close ) {
				continue;
			}
			$clean[] = array(
				'open'     => $open,
				'close'    => $close,
				'openFmt'  => idara_business_hours_format_time( $open, $format ),
				'closeFmt' => idara_business_hours_format_time( $close, $format ),
			);
		}
		return $clean;
	}
}

/* ── Time format ──────────────────────────────────────────────────────── */
$idara_bh_format = isset( $attributes['timeFormat'] ) && '24' === $attributes['timeFormat'] ? '24' : '12';

/* ── Timezone (site default unless overridden with a valid identifier) ──── */
$idara_bh_tz_override = isset( $attributes['timezoneOverride'] ) ? (string) $attributes['timezoneOverride'] : '';
$idara_bh_tz_string   = wp_timezone_string();
if ( '' !== $idara_bh_tz_override && in_array( $idara_bh_tz_override, timezone_identifiers_list(), true ) ) {
	$idara_bh_tz_string = $idara_bh_tz_override;
}
try {
	$idara_bh_tz = new DateTimeZone( $idara_bh_tz_string );
} catch ( Exception $e ) {
	$idara_bh_tz        = wp_timezone();
	$idara_bh_tz_string = $idara_bh_tz->getName();
}

/* ── Weekly days (index 0 = Monday … 6 = Sunday) ──────────────────────── */
$idara_bh_raw_days = isset( $attributes['days'] ) && is_array( $attributes['days'] ) ? $attributes['days'] : array();
$idara_bh_days     = array();
for ( $idara_bh_i = 0; $idara_bh_i < 7; $idara_bh_i++ ) {
	$idara_bh_src        = $idara_bh_raw_days[ $idara_bh_i ] ?? array();
	$idara_bh_day_closed = ! empty( $idara_bh_src['closed'] );
	$idara_bh_day_slots  = $idara_bh_day_closed ? array() : idara_business_hours_clean_slots( $idara_bh_src['slots'] ?? array(), $idara_bh_format );
	if ( ! $idara_bh_day_closed && empty( $idara_bh_day_slots ) ) {
		$idara_bh_day_closed = true; // open with no valid slots == closed
	}
	$idara_bh_days[ $idara_bh_i ] = array(
		'closed' => $idara_bh_day_closed,
		'slots'  => $idara_bh_day_slots,
	);
}

/* ── Special / holiday hours ──────────────────────────────────────────── */
$idara_bh_raw_special = isset( $attributes['specialHours'] ) && is_array( $attributes['specialHours'] ) ? $attributes['specialHours'] : array();
$idara_bh_special     = array();
foreach ( $idara_bh_raw_special as $idara_bh_sp ) {
	$idara_bh_date = isset( $idara_bh_sp['date'] ) ? trim( (string) $idara_bh_sp['date'] ) : '';
	if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $idara_bh_date ) ) {
		continue;
	}
	$idara_bh_sp_closed = ! empty( $idara_bh_sp['closed'] );
	$idara_bh_sp_slots  = $idara_bh_sp_closed ? array() : idara_business_hours_clean_slots( $idara_bh_sp['slots'] ?? array(), $idara_bh_format );
	$idara_bh_special[] = array(
		'date'   => $idara_bh_date,
		'closed' => $idara_bh_sp_closed,
		'slots'  => $idara_bh_sp_slots,
		'label'  => isset( $idara_bh_sp['label'] ) ? sanitize_text_field( $idara_bh_sp['label'] ) : '',
	);
}

/* ── Localised day names (Monday-first) ───────────────────────────────── */
global $wp_locale;
$idara_bh_wp_index  = array( 1, 2, 3, 4, 5, 6, 0 ); // Mon..Sun → WP Sunday-based weekday index.
$idara_bh_day_names = array();
foreach ( $idara_bh_wp_index as $idara_bh_wpi ) {
	$idara_bh_day_names[] = $wp_locale->get_weekday( $idara_bh_wpi );
}

/* ── Options ──────────────────────────────────────────────────────────── */
$idara_bh_show_status     = ! empty( $attributes['showStatus'] );
$idara_bh_highlight_today = ! empty( $attributes['highlightToday'] );
$idara_bh_hide_closed     = ! empty( $attributes['hideClosedDays'] );
$idara_bh_heading         = isset( $attributes['heading'] ) ? trim( wp_strip_all_tags( $attributes['heading'] ) ) : '';

// Accent: allow CSS-color-safe characters only (hex / rgb / hsl / named).
$idara_bh_raw_accent = isset( $attributes['accentColor'] ) ? (string) $attributes['accentColor'] : '';
$idara_bh_accent     = preg_replace( '/[^a-zA-Z0-9#(),.\s%\-]/', '', $idara_bh_raw_accent );
if ( '' === trim( $idara_bh_accent ) ) {
	$idara_bh_accent = '#0f766e';
}

/* ── Label templates (translatable, %s placeholders filled by JS / below) ── */
$idara_bh_labels = array(
	'open'     => __( 'Open now', 'idara-business-hours' ),
	'closed'   => __( 'Closed', 'idara-business-hours' ),
	'closedDay'=> __( 'Closed', 'idara-business-hours' ),
	/* translators: %s: closing time, e.g. "5:00 PM". */
	'closesAt' => __( 'Closes at %s', 'idara-business-hours' ),
	/* translators: %s: opening time, e.g. "9:00 AM". */
	'opensAt'  => __( 'Opens at %s', 'idara-business-hours' ),
	/* translators: %1$s: weekday name, %2$s: opening time. */
	'opensDay' => __( 'Opens %1$s at %2$s', 'idara-business-hours' ),
);

/* ── Server-side status fallback (progressive enhancement; JS recomputes live) ── */
$idara_bh_now       = new DateTime( 'now', $idara_bh_tz );
$idara_bh_today_idx = (int) $idara_bh_now->format( 'N' ) - 1; // 1..7 (Mon..Sun) → 0..6.
$idara_bh_today_str = $idara_bh_now->format( 'Y-m-d' );
$idara_bh_now_mins  = (int) $idara_bh_now->format( 'G' ) * 60 + (int) $idara_bh_now->format( 'i' );

// Resolve today's schedule (special override wins).
$idara_bh_today_closed = $idara_bh_days[ $idara_bh_today_idx ]['closed'];
$idara_bh_today_slots  = $idara_bh_days[ $idara_bh_today_idx ]['slots'];
foreach ( $idara_bh_special as $idara_bh_sp ) {
	if ( $idara_bh_sp['date'] === $idara_bh_today_str ) {
		$idara_bh_today_closed = $idara_bh_sp['closed'];
		$idara_bh_today_slots  = $idara_bh_sp['slots'];
		break;
	}
}

$idara_bh_is_open      = false;
$idara_bh_active_close = '';
if ( ! $idara_bh_today_closed ) {
	foreach ( $idara_bh_today_slots as $idara_bh_slot ) {
		$idara_bh_o = idara_business_hours_to_minutes( $idara_bh_slot['open'] );
		$idara_bh_c = idara_business_hours_to_minutes( $idara_bh_slot['close'] );
		$idara_bh_within = ( $idara_bh_c <= $idara_bh_o )
			? ( $idara_bh_now_mins >= $idara_bh_o || $idara_bh_now_mins < $idara_bh_c )
			: ( $idara_bh_now_mins >= $idara_bh_o && $idara_bh_now_mins < $idara_bh_c );
		if ( $idara_bh_within ) {
			$idara_bh_is_open      = true;
			$idara_bh_active_close = $idara_bh_slot['closeFmt'];
			break;
		}
	}
}

// Build the fallback status label + hint.
if ( $idara_bh_is_open ) {
	$idara_bh_status_label = $idara_bh_labels['open'];
	$idara_bh_status_hint  = sprintf( $idara_bh_labels['closesAt'], $idara_bh_active_close );
} else {
	$idara_bh_status_label = $idara_bh_labels['closed'];
	$idara_bh_status_hint  = '';

	// Next opening later today?
	$idara_bh_next_today = null;
	foreach ( $idara_bh_today_slots as $idara_bh_slot ) {
		if ( idara_business_hours_to_minutes( $idara_bh_slot['open'] ) > $idara_bh_now_mins ) {
			if ( null === $idara_bh_next_today || idara_business_hours_to_minutes( $idara_bh_slot['open'] ) < idara_business_hours_to_minutes( $idara_bh_next_today['open'] ) ) {
				$idara_bh_next_today = $idara_bh_slot;
			}
		}
	}
	if ( $idara_bh_next_today ) {
		$idara_bh_status_hint = sprintf( $idara_bh_labels['opensAt'], $idara_bh_next_today['openFmt'] );
	} else {
		// Scan upcoming days (weekly schedule).
		for ( $idara_bh_n = 1; $idara_bh_n <= 7; $idara_bh_n++ ) {
			$idara_bh_idx = ( $idara_bh_today_idx + $idara_bh_n ) % 7;
			$idara_bh_day = $idara_bh_days[ $idara_bh_idx ];
			if ( $idara_bh_day['closed'] || empty( $idara_bh_day['slots'] ) ) {
				continue;
			}
			$idara_bh_first = $idara_bh_day['slots'][0];
			foreach ( $idara_bh_day['slots'] as $idara_bh_slot ) {
				if ( idara_business_hours_to_minutes( $idara_bh_slot['open'] ) < idara_business_hours_to_minutes( $idara_bh_first['open'] ) ) {
					$idara_bh_first = $idara_bh_slot;
				}
			}
			$idara_bh_status_hint = sprintf( $idara_bh_labels['opensDay'], $idara_bh_day_names[ $idara_bh_idx ], $idara_bh_first['openFmt'] );
			break;
		}
	}
}

/* ── Interactivity context (live status seeded with the server fallback) ── */
$idara_bh_context = array(
	'tz'             => $idara_bh_tz_string,
	'timeFormat'     => $idara_bh_format,
	'highlightToday' => $idara_bh_highlight_today,
	'days'           => $idara_bh_days,
	'special'        => $idara_bh_special,
	'dayNames'       => $idara_bh_day_names,
	'labels'         => $idara_bh_labels,
	// Live values (data-wp-text / data-wp-class bind to these; JS keeps them current):
	'isOpen'         => $idara_bh_is_open,
	'statusLabel'    => $idara_bh_status_label,
	'statusHint'     => $idara_bh_status_hint,
	'todayIndex'     => $idara_bh_today_idx,
);

/* ── Wrapper ──────────────────────────────────────────────────────────── */
$idara_bh_wrapper = get_block_wrapper_attributes(
	array(
		'class' => 'idara-bh',
		'style' => '--idara-bh-accent:' . $idara_bh_accent . ';',
	)
);

/* ── Output ───────────────────────────────────────────────────────────── */
?>
<div
	<?php echo $idara_bh_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- generated by get_block_wrapper_attributes(), a trusted WP core function. ?>
	data-wp-interactive="idara/business-hours"
	<?php echo wp_interactivity_data_wp_context( $idara_bh_context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by the Interactivity API helper. ?>
	<?php echo $idara_bh_show_status ? ' data-wp-init="callbacks.refreshStatus"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static directive string. ?>
>
	<?php if ( '' !== $idara_bh_heading ) : ?>
		<p class="idara-bh-heading"><?php echo esc_html( $idara_bh_heading ); ?></p>
	<?php endif; ?>

	<?php if ( $idara_bh_show_status ) : ?>
		<div
			class="idara-bh-status <?php echo $idara_bh_is_open ? 'is-open' : 'is-closed'; ?>"
			data-wp-class--is-open="context.isOpen"
			data-wp-class--is-closed="!context.isOpen"
			role="status"
			aria-live="polite"
		>
			<span class="idara-bh-status-dot" aria-hidden="true"></span>
			<span class="idara-bh-status-label" data-wp-text="context.statusLabel"><?php echo esc_html( $idara_bh_status_label ); ?></span>
			<?php if ( '' !== $idara_bh_status_hint ) : ?>
				<span class="idara-bh-status-sep" aria-hidden="true">·</span>
			<?php endif; ?>
			<span class="idara-bh-status-hint" data-wp-text="context.statusHint"><?php echo esc_html( $idara_bh_status_hint ); ?></span>
		</div>
	<?php endif; ?>

	<table class="idara-bh-table">
		<caption class="screen-reader-text"><?php echo esc_html( '' !== $idara_bh_heading ? $idara_bh_heading : __( 'Business hours', 'idara-business-hours' ) ); ?></caption>
		<tbody>
			<?php
			for ( $idara_bh_i = 0; $idara_bh_i < 7; $idara_bh_i++ ) :
				$idara_bh_day = $idara_bh_days[ $idara_bh_i ];
				if ( $idara_bh_hide_closed && $idara_bh_day['closed'] ) {
					continue;
				}
				$idara_bh_is_today_row  = $idara_bh_highlight_today && $idara_bh_i === $idara_bh_today_idx;
				$idara_bh_row_context   = wp_interactivity_data_wp_context( array( 'dayIndex' => $idara_bh_i ) );

				// Build this day's display value.
				if ( $idara_bh_day['closed'] ) {
					$idara_bh_value = $idara_bh_labels['closedDay'];
				} else {
					$idara_bh_ranges = array();
					foreach ( $idara_bh_day['slots'] as $idara_bh_slot ) {
						$idara_bh_ranges[] = $idara_bh_slot['openFmt'] . ' – ' . $idara_bh_slot['closeFmt'];
					}
					$idara_bh_value = implode( ', ', $idara_bh_ranges );
				}
				?>
				<tr
					class="idara-bh-row<?php echo $idara_bh_day['closed'] ? ' is-closed-day' : ''; ?><?php echo $idara_bh_is_today_row ? ' idara-bh-today' : ''; ?>"
					data-wp-class--idara-bh-today="state.isToday"
					<?php echo $idara_bh_row_context; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by the Interactivity API helper. ?>
				>
					<th scope="row" class="idara-bh-day"><?php echo esc_html( $idara_bh_day_names[ $idara_bh_i ] ); ?></th>
					<td class="idara-bh-hours"><?php echo esc_html( $idara_bh_value ); ?></td>
				</tr>
			<?php endfor; ?>
		</tbody>
	</table>
</div>
<?php

/* ── LocalBusiness JSON-LD ────────────────────────────────────────────── */
if ( ! empty( $attributes['showSchema'] ) ) {
	$idara_bh_allowed_types = array(
		'LocalBusiness',
		'Restaurant',
		'CafeOrCoffeeShop',
		'BarOrPub',
		'Bakery',
		'Store',
		'ClothingStore',
		'GroceryStore',
		'HealthAndBeautyBusiness',
		'BeautySalon',
		'HairSalon',
		'MedicalClinic',
		'Dentist',
		'ProfessionalService',
		'LegalService',
		'FinancialService',
		'RealEstateAgent',
		'AutomotiveBusiness',
		'AutoRepair',
		'LodgingBusiness',
		'EntertainmentBusiness',
	);
	$idara_bh_type = isset( $attributes['businessType'] ) ? (string) $attributes['businessType'] : 'LocalBusiness';
	if ( ! in_array( $idara_bh_type, $idara_bh_allowed_types, true ) ) {
		$idara_bh_type = 'LocalBusiness';
	}

	$idara_bh_schema = array(
		'@context' => 'https://schema.org',
		'@type'    => $idara_bh_type,
	);

	$idara_bh_name = isset( $attributes['businessName'] ) ? trim( wp_strip_all_tags( $attributes['businessName'] ) ) : '';
	if ( '' === $idara_bh_name ) {
		$idara_bh_name = wp_strip_all_tags( get_bloginfo( 'name' ) );
	}
	if ( '' !== $idara_bh_name ) {
		$idara_bh_schema['name'] = $idara_bh_name;
	}

	// Address (only include the parts that are filled in).
	$idara_bh_address = array_filter(
		array(
			'streetAddress'   => isset( $attributes['streetAddress'] ) ? trim( wp_strip_all_tags( $attributes['streetAddress'] ) ) : '',
			'addressLocality' => isset( $attributes['addressLocality'] ) ? trim( wp_strip_all_tags( $attributes['addressLocality'] ) ) : '',
			'addressRegion'   => isset( $attributes['addressRegion'] ) ? trim( wp_strip_all_tags( $attributes['addressRegion'] ) ) : '',
			'postalCode'      => isset( $attributes['postalCode'] ) ? trim( wp_strip_all_tags( $attributes['postalCode'] ) ) : '',
			'addressCountry'  => isset( $attributes['addressCountry'] ) ? trim( wp_strip_all_tags( $attributes['addressCountry'] ) ) : '',
		)
	);
	if ( ! empty( $idara_bh_address ) ) {
		$idara_bh_address['@type']    = 'PostalAddress';
		$idara_bh_schema['address']   = $idara_bh_address;
	}

	$idara_bh_phone = isset( $attributes['telephone'] ) ? trim( wp_strip_all_tags( $attributes['telephone'] ) ) : '';
	if ( '' !== $idara_bh_phone ) {
		$idara_bh_schema['telephone'] = $idara_bh_phone;
	}
	$idara_bh_price = isset( $attributes['priceRange'] ) ? trim( wp_strip_all_tags( $attributes['priceRange'] ) ) : '';
	if ( '' !== $idara_bh_price ) {
		$idara_bh_schema['priceRange'] = $idara_bh_price;
	}
	$idara_bh_url = isset( $attributes['businessUrl'] ) ? esc_url_raw( $attributes['businessUrl'] ) : '';
	if ( '' === $idara_bh_url ) {
		$idara_bh_url = home_url( '/' );
	}
	$idara_bh_schema['url'] = $idara_bh_url;

	// openingHoursSpecification (schema.org uses fixed English day names).
	$idara_bh_schema_days = array( 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' );
	$idara_bh_specs       = array();
	for ( $idara_bh_i = 0; $idara_bh_i < 7; $idara_bh_i++ ) {
		if ( $idara_bh_days[ $idara_bh_i ]['closed'] ) {
			continue;
		}
		foreach ( $idara_bh_days[ $idara_bh_i ]['slots'] as $idara_bh_slot ) {
			$idara_bh_specs[] = array(
				'@type'     => 'OpeningHoursSpecification',
				'dayOfWeek' => $idara_bh_schema_days[ $idara_bh_i ],
				'opens'     => $idara_bh_slot['open'],
				'closes'    => $idara_bh_slot['close'],
			);
		}
	}
	if ( ! empty( $idara_bh_specs ) ) {
		$idara_bh_schema['openingHoursSpecification'] = $idara_bh_specs;
	}

	// JSON_HEX_TAG prevents any "</script>" breakout from user-entered fields.
	echo '<script type="application/ld+json">'
		. wp_json_encode( $idara_bh_schema, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
		. '</script>';
}
