import React from 'react';
import axios from './axios';
import {Logo} from './logo';
import {ProfilePic} from './profilepic';
import {PicUploader} from "./picUploader";
import {getSocket} from "./socket";
import Searchbar from "./searchbar";
import {Link} from 'react-router';



export class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.showUploader = this.showUploader.bind(this);
        this.showEditBio = this.showEditBio.bind(this);
        this.readInput = this.readInput.bind(this);
        this.updateBio = this.updateBio.bind(this);
    }
    showUploader() {
        this.setState({
            uploaderIsVisible: true
        });
    }
    closeUploader() {
        this.setState({
            uploaderIsVisible: false
        });
    }
    showEditBio() {
        this.setState({
            editBioIsVisible: true
        });
    }
    componentDidMount() {
        axios.get("/api/user")
            .then((data) => {
                const {first, last, id, bio, image} = data.data;
                this.setState({
                    image,
                    first,
                    last,
                    id,
                    bio
                });
            });
    }
    uploadImage() {
        var formData = new FormData();

        formData.append('file', this.state.file),

        axios.post("/upload", formData)
            .then((resp) => {
                let data = resp.data;
                if(!data.success) {
                    this.setState({
                        error: true
                    });
                } else {
                    location.replace("/");
                }
            });
    }
    updateBio() {
        let {textareaBio} = this.state;

        axios.post("/bio", {
            bio: textareaBio
        });

        this.setState({
            bio: textareaBio,
            editBioIsVisible: false
        });

    }
    handleChange(e) {
        this.setState({
            file: e.target.files[0]
        });

    }
    readInput(e) {
        this.setState({
            textareaBio : e.target.value
        });
    }
    render() {
        getSocket();
        const {id, image, first, last, bio, editBioIsVisible} = this.state;
        const children = React.cloneElement(this.props.children, {
            profile : {
                id,
                image,
                first,
                last,
                bio,
                editBioIsVisible,
                showEditBio: this.showEditBio,
                readInput: this.readInput,
                updateBio: this.updateBio
            }
        });

        return(
            <div>
                <header>
                    <div className = "column">
                        <Link to="/">Home</Link>
                        <Link to="/chat">Chat</Link>
                        <Link to="/online">See who is online</Link>
                        <Searchbar />
                    </div>

                    <Logo />
                    <div className = "column ownProfile">
                        <ProfilePic
                            showUploader = {this.showUploader}
                            image = {this.state.image}
                        />
                        <Link to="/me">See your profile</Link>
                    </div>
                </header>

                {children}

                {this.state.uploaderIsVisible &&
                    <PicUploader
                        uploadImage = {(e) => {this.uploadImage(e);}}
                        handleChange = {(e) => this.handleChange(e)}
                        closeUploader = {(e) => {this.closeUploader(e);}}
                    />
                }
            </div>
        );
    }
}
