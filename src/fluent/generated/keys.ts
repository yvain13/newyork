import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    aiux_source: {
                        table: 'sys_module'
                        id: '304cecc6e7b230ae96a5f7a195ab8322'
                    }
                    'aiux-color-swatch|newyork': {
                        table: 'sys_aix_color_swatch'
                        id: 'b32cafbeca4910db8c27ea3a0ae9a6c8'
                    }
                    'aiux-experience-page-rel|x-1433234-newyork-city-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: '9fdbc1c9eab57919847cff5bfe6b367c'
                    }
                    'aiux-experience-page-rel|x-1433234-newyork-home-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: 'fa1d744c9c7f2ad2ebc0f802465757d4'
                    }
                    'aiux-experience-page-rel|x-1433234-newyork-incidents-page': {
                        table: 'sys_aix_experience_page_rel'
                        id: 'e6bd4e98d18ecea38e7b280dac270243'
                    }
                    'aiux-experience-prop|appHeadCss': {
                        table: 'sys_aix_experience_properties'
                        id: '0b78ff5df4ed2526a05a378490d1b4d1'
                    }
                    'aiux-experience-prop|appTailwindCss': {
                        table: 'sys_aix_experience_properties'
                        id: '3a97cf7b90d7cdf0ce6e0e1901542205'
                    }
                    'aiux-experience|newyork': {
                        table: 'sys_aix_experience'
                        id: 'd2b03dd5b467b9dcc1f340860bdfc5e1'
                    }
                    'aiux-layout-widget|lifecycle': {
                        table: 'sys_aix_widget'
                        id: 'fe186cc2d656f17d2284a99eea1c4141'
                    }
                    'aiux-page-widget|x-1433234-newyork-city-page': {
                        table: 'sys_aix_widget'
                        id: 'cd5877a8766afaffb04e0ae5f8105d28'
                    }
                    'aiux-page-widget|x-1433234-newyork-home-page': {
                        table: 'sys_aix_widget'
                        id: '1bdceae531e83820957b8466b418aa36'
                    }
                    'aiux-page-widget|x-1433234-newyork-incidents-page': {
                        table: 'sys_aix_widget'
                        id: '930d000ef3baecd80308c0217b218128'
                    }
                    'aiux-page|x-1433234-newyork-city-page': {
                        table: 'sys_aix_page'
                        id: '04c0cd4b97ba2a27ad27da291413ae7e'
                    }
                    'aiux-page|x-1433234-newyork-home-page': {
                        table: 'sys_aix_page'
                        id: '5a28157046e456292f06f1e6b638d809'
                    }
                    'aiux-page|x-1433234-newyork-incidents-page': {
                        table: 'sys_aix_page'
                        id: '0060877efa633574c04ad44e8c53bb11'
                    }
                    'aiux-theme|newyork': {
                        table: 'sys_aix_theme'
                        id: 'c1ac39db165290fecc2f552a12943c17'
                    }
                    'aiux-widget|aiux-hello-world': {
                        table: 'sys_aix_widget'
                        id: 'c46bee9a169cc28f22565c5119ae07b1'
                    }
                    bom_json: {
                        table: 'sys_module'
                        id: '39fe6d7b369147639e987b6cceb241c0'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: '2c56e7a1dfec4fd78abe9e7a477b0466'
                    }
                }
                composite: [
                    {
                        table: 'sn_glider_source_artifact'
                        id: '0c341c734cea43de9f2d1ce3cbc69177'
                        key: {
                            name: 'aiux-source d30daaf3a57f42cba92910ea2f662caf'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '5e25abd2fab144a780e1f71df96148ed'
                        key: {
                            application_file: '304cecc6e7b230ae96a5f7a195ab8322'
                            source_artifact: '0c341c734cea43de9f2d1ce3cbc69177'
                        }
                    },
                ]
            }
        }
    }
}
