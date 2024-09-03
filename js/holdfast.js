document.addEventListener('DOMContentLoaded', () => {
    const showError = function (error, message) {
        console.error(error);

        alert(message + ': ' + error.message);
    }

    window.HoldfastPodcast = (function () {

        let holdfast = {
            holdfastDirectoryHandle: null,
            podcastDirectoryHandle: null,
            reusablesDirectoryHandle: null,
            episodesDirectoryHandle: null,
            episodeDirectoryHandle: null,
            jsonFileHandle: null,

            data: {
                current_podcast: null,
                current_episode: null,
            },

            ensureDirectorySelected: function () {
                if (!this.holdfastDirectoryHandle) {
                    alert('You need to select a directory.');

                    return false;
                }

                return true;
            },
        };

        async function saveHoldfastData() {
            try {
                const mainDirectoryHandle = holdfast.holdfastDirectoryHandle;

                const jsonFileHandle = await mainDirectoryHandle.getFileHandle('holdfast.json', { create: true });

                const writeableStream = await jsonFileHandle.createWritable();

                const stringData = JSON.stringify(holdfast.data);

                await writeableStream.write(stringData);

                await writeableStream.close();
            } catch (err) {
                showError(err, 'Could not save Holdfast data');
            }
        }

        // async function saveHoldfastData() {
        //     try {
        //         const writeableStream = await holdfast.jsonFileHandle.createWritable();
        //
        //         const stringData = JSON.stringify(holdfast.data);
        //
        //         await writeableStream.write(stringData);
        //
        //         await writeableStream.close();
        //     } catch (err) {
        //         showError(err, 'Could not save Holdfast data');
        //     }
        // }

        async function getJsonFileData(
            directoryHandle,
            jsonFile
        ) {
            const fileHandle = await directoryHandle.getFileHandle(jsonFile, { create: true });

            const file = await fileHandle.getFile();

            let text = '';
            if (file.size) {
                text = await file.text();
            }

            return JSON.parse(text);
        }

        async function getHoldfastDirectory() {
            try {
                // Open file picker and destructure the result the first handle
                const directoryHandle = await window.showDirectoryPicker();

                // get file contents
                holdfast.holdfastDirectoryHandle = directoryHandle;

                holdfast.data = await getJsonFileData(directoryHandle, 'holdfast.json');

                if (holdfast.data.current_podcast) {
                    setActivePodcast(holdfast.data.current_podcast);

                    if (holdfast.data.current_episode) {
                        setActiveEpisode(holdfast.data.current_episode);
                    }
                } else {
                    showPodcastSelector();
                }

                await saveHoldfastData();

                document.getElementById(
                    'holdfast-init-app'
                ).style.display = 'none';
            } catch (err) {
                showError(err, 'Could not boot up Holdfast. Please try again');
            }
        }

        async function showPodcastSelector() {
            const foldersHandle = await holdfast.holdfastDirectoryHandle
                .getDirectoryHandle('podcasts');

            let html_list = document.getElementById('holdfast-podcast-list');

            html_list.innerHTML = '';

            await iterateOverFolders(
                foldersHandle,
                function (name, entry, html_list) {
                    const listItem = document.createElement('li');
                    listItem.classList.add('js-podcast-folder');

                    const button = document.createElement('button');
                    button.classList.add('button-link', 'holdfast-button-link');
                    button.type = 'button';
                    button.textContent = name;

                    button.addEventListener('click', () => {
                        setActivePodcast(name);
                    });

                    listItem.appendChild(button);

                    html_list.appendChild(listItem);
                },
                html_list
            );

            document.getElementById(
                'holdfast-podcasts-app'
            ).style.display = 'block';
        }

        async function setActivePodcast(podcast_name, save_json) {
            holdfast.data.current_podcast = podcast_name;

            if ('undefined' === typeof save_json && save_json) {
                await saveHoldfastData();
            }

            const podcastHandler = await getPodcastDirectory(holdfast.data.current_podcast);

            holdfast.episodesDirectoryHandle = await getEpisodesDirectory(podcastHandler);

            holdfast.reusablesDirectoryHandle = await getReusablesDirectory(podcastHandler);

            window.dispatchEvent(new CustomEvent('holdfastPodcastSelected', {
                detail: {message: podcast_name},
                bubbles: true,
                cancelable: true
            }));

            return podcastHandler;
        }

        async function createPodcastFolders(folder) {
            const podcastHandler = await getPodcastDirectory(folder);

            holdfast.episodesDirectoryHandle = await getEpisodesDirectory(podcastHandler);

            holdfast.reusablesDirectoryHandle = await getReusablesDirectory(podcastHandler);

            setActivePodcast(folder);
        }

        async function getPodcastDirectory(folder_name) {
            const podcastsFolderHandle = await holdfast.holdfastDirectoryHandle
                .getDirectoryHandle('podcasts');

            const podcastHandle = podcastsFolderHandle.getDirectoryHandle(
                folder_name,
                {create: true}
            );

            holdfast.podcastDirectoryHandle = podcastHandle;

            return podcastHandle;
        }

        async function getReusablesDirectory(podcastHandle) {
            try {
                const reusablesHandle = await podcastHandle.getDirectoryHandle(
                    'reusables',
                    {create: true}
                );

                holdfast.reusablesDirectoryHandle = reusablesHandle;

                return reusablesHandle;
            } catch (err) {
                showError(err, 'Could not get Reusables directory');
            }
        }

        async function getEpisodesDirectory(podcastHandle) {
            try {
                const episodesHandle = await podcastHandle.getDirectoryHandle(
                    'episodes',
                    {create: true}
                );

                holdfast.episodesDirectoryHandle = episodesHandle;

                return episodesHandle;
            } catch (err) {
                showError(err, 'Could not get Episodes directory');
            }
        }

        async function getEpisodeDirectory(episodesDirectoryHandle) {
            try {
                const episodesHandle = await podcastHandle.getDirectoryHandle(
                    'episodes',
                    {create: true}
                );

                holdfast.episodesDirectoryHandle = episodesHandle;

                return episodesHandle;
            } catch (err) {
                showError(err, 'Could not get Episodes directory');
            }
        }

        /* REUSABLES */
        async function showReusablesList() {
            try {
                let html_list = document.getElementById('holdfast-reusables-list');

                html_list = await iterateOverFiles(
                    holdfast.reusablesDirectoryHandle,
                    function (name, entry, html_list) {
                        // Create a list item for the directory
                        const listItem = document.createElement('li');
                        listItem.classList.add('js-reusable-filename');
                        listItem.textContent = name;

                        html_list.appendChild(listItem);
                    },
                    html_list
                )

                if (!html_list.children.length) {
                    let listItem = document.createElement('li');
                    listItem.classList.add('reusable-empty-message', 'holdfast-empty-message');
                    listItem.textContent = 'This podcast does not have any reusables yet...';

                    html_list.appendChild(listItem);
                }
            } catch (err) {
                showError(err, 'Could not display reusables');
            }
        }


        /* EPISODES */
        async function showEpisodesList() {
            try {
                let html_list = document.getElementById('holdfast-episodes-list');

                html_list.innerHTML = '';

                html_list = await iterateOverFolders(
                    holdfast.episodesDirectoryHandle,
                    function (name, entry, html_list) {
                        const listItem = document.createElement('li');
                        listItem.classList.add('js-episode-folder');

                        const button = document.createElement('button');
                        button.classList.add('button-link', 'holdfast-button-link');
                        button.type = 'button';
                        button.textContent = name;

                        button.addEventListener('click', () => {
                            setActiveEpisode(name);
                        });

                        listItem.appendChild(button);

                        html_list.appendChild(listItem);
                    },
                    html_list
                )

                if (!html_list.children.length) {
                    let listItem = document.createElement('li');
                    listItem.classList.add('episode-empty-message', 'holdfast-empty-message');
                    listItem.textContent = 'This podcast does not have any episodes yet...';

                    html_list.appendChild(listItem);
                }
            } catch (err) {
                showError(err, 'Could not display episodes');
            }
        }

        async function setActiveEpisode(episode_name, save_json) {
            holdfast.data.current_episode = episode_name;

            if ('undefined' === typeof save_json && save_json) {
                await saveHoldfastData();
            }

            const episodesHandle = holdfast.episodesDirectoryHandle;

            holdfast.episodeDirectoryHandle = await episodesHandle.getDirectoryHandle(
                episode_name,
                {create: true}
            );

            window.dispatchEvent(new CustomEvent('holdfastEpisodeSelected', {
                detail: {message: episode_name},
                bubbles: true,
                cancelable: true
            }));

            return holdfast.episodeDirectoryHandle;
        }

        async function showEpisodeData() {
            const episode_json = await getJsonFileData(
                holdfast.episodeDirectoryHandle,
                'episode.json'
            );

            console.log(episode_json);
        }

        async function iterateOverFolders(
            directory_handle,
            item_closure,
            parent,
        ) {
            for await (const [name, entry] of directory_handle) {
                // Check if the entry is a directory
                if (entry.kind === 'directory') {
                    item_closure(name, entry, parent);
                }
            }

            return parent;
        }

        async function iterateOverFiles(
            directory_handle,
            item_closure,
            parent,
        ) {
            for await (const [name, entry] of directory_handle) {
                // Check if the entry is a directory
                if (entry.kind !== 'directory') {
                    item_closure(name, entry, parent);
                }
            }

            return parent;
        }


        let init = function () {
            let holdfast_button = document
                .getElementById('holdfast-init')
                .addEventListener('click', () => {
                    getHoldfastDirectory();
                });

            let podcasts_form = document
                .getElementById('holdfast-podcast-creation')
                .addEventListener('submit', (event) => {
                    event.preventDefault();

                    let title = document.getElementById(
                        'holdfast-podcast-input'
                    ).value;

                    let folder = title.toLowerCase()
                        .replaceAll(' ', '-');

                    createPodcastFolders(folder);

                    return false;
                });

            window.addEventListener('holdfastPodcastSelected', (event) => {
                console.log('podcastSelected', event);
                const podcast = event.detail.message;

                if (holdfast.data.current_podcast != podcast) {
                    holdfast.data.current_episode = null;
                }

                document.getElementById('holdfast-podcasts-app').style.display = 'none';
                document.getElementById('holdfast-podcast-app').style.display = 'block';

                document.getElementById('holdfast-active-podcast')
                    .innerText = holdfast.data.current_podcast;

                showReusablesList();
                showEpisodesList();
            });

            window.addEventListener('holdfastEpisodeSelected', (event) => {
                console.log('episodeSelected', event);
                document.getElementById('holdfast-podcast-episodes').style.display = 'none';

                document.getElementById('holdfast-active-episode')
                    .innerText = holdfast.data.current_episode;

                showEpisodeData();
            });
        };

        init();

        return holdfast;
    })();
});
