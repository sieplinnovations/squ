<?php

/**
 * @file
 * Theme settings for SQU Theme: upload the footer logo and top pattern from
 * Appearance > SQU Theme > Settings.
 */

use Drupal\Core\Form\FormStateInterface;
use Drupal\file\Entity\File;

/**
 * Implements hook_form_FORM_ID_alter() for system_theme_settings.
 */
function squ_theme_form_system_theme_settings_alter(array &$form, FormStateInterface $form_state) {
  // Only on this theme's own settings page.
  $build_info = $form_state->getBuildInfo();
  if (($build_info['args'][0] ?? NULL) !== 'squ_theme') {
    return;
  }

  $form['squ_footer'] = [
    '#type' => 'details',
    '#title' => t('Footer images'),
    '#open' => TRUE,
    '#description' => t('Leave empty to use the images bundled with the theme. Footer icon buttons are managed under Structure > Taxonomy > Footer Icons.'),
  ];

  $fields = [
    'footer_logo' => [
      t('Footer logo'),
      t('White/gold logo on a transparent or dark background (PNG or SVG). Shown at up to about 230 px wide.'),
    ],
    'footer_pattern' => [
      t('Footer top pattern'),
      t('One seamless repeating tile (PNG or SVG). It is repeated horizontally and scaled to 24 px high.'),
    ],
  ];
  foreach ($fields as $key => [$title, $description]) {
    $value = theme_get_setting($key, 'squ_theme');
    $form['squ_footer'][$key] = [
      '#type' => 'managed_file',
      '#title' => $title,
      '#description' => $description,
      '#default_value' => is_array($value) ? $value : ($value ? [$value] : []),
      '#upload_location' => 'public://squ-footer',
      '#upload_validators' => [
        'FileExtension' => ['extensions' => 'png svg jpg jpeg webp gif'],
      ],
    ];
  }

  $form['#submit'][] = 'squ_theme_footer_settings_submit';
}

/**
 * Makes the uploaded footer files permanent so Drupal doesn't garbage-collect them.
 */
function squ_theme_footer_settings_submit(array &$form, FormStateInterface $form_state) {
  foreach (['footer_logo', 'footer_pattern'] as $key) {
    $fids = $form_state->getValue($key);
    if (!empty($fids[0]) && ($file = File::load($fids[0]))) {
      if (!$file->isPermanent()) {
        $file->setPermanent();
        $file->save();
      }
      \Drupal::service('file.usage')->add($file, 'squ_theme', 'theme', $key);
    }
  }
}
