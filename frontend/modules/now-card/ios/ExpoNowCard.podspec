Pod::Spec.new do |s|
  s.name           = 'ExpoNowCard'
  s.version        = '1.0.0'
  s.summary        = 'The lock-screen now card: a Live Activity.'
  s.description    = 'Shows the precomputed now-card script (lib/nowCard.ts) as a Live Activity.'
  s.license        = 'UNLICENSED'
  s.author         = 'BA'
  s.homepage       = 'https://ba.janbambas.cz'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit', 'BackgroundTasks'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
