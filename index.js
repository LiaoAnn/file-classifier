import { fs } from "file-system";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const getFiles = async (dir) => {
    try {
        if (!fs.lstatSync(dir).isDirectory()) {
            return dir;
        }
    } catch {
        return dir;
    }
    return new Promise(async (resolve, reject) => {
        fs.readdir(dir, (err, files) => {
            if (err) {
                reject(err);
            }
            files = files.map(file => path.join(dir, file));
            resolve(files);
        })
    })
        .then(async files => {
            files = Promise.all(files.map(file => getFiles(file)))
                .then(childs => {
                    let result = [];
                    while (childs.length) {
                        let pop = childs.pop();
                        if (pop instanceof Array) {
                            for (let i = 0; i < pop.length; i++) {
                                result.push(pop[i]);
                            }
                        } else {
                            result.push(pop);
                        }
                    }
                    return result;
                });
            return files;
        })
        .catch(err => {
            console.error(err);
            return [];
        })
}
const { argv } = process;

let argument = {
    options: []
};

for (let i = 2; i < argv.length; i++) {
    let arg = argv[i];
    if (arg.includes("=")) {
        const [name, value] = arg.split("=");
        argument[name] = value;
    } else {
        argument.options.push(arg);
    }
}

let files = await getFiles(argument["--from"]);
console.log(files.length);
let mode = 1;
if (argument.options.indexOf("-D") != -1) {
    mode = 3;
} else if (argument.options.indexOf("-M") != -1) {
    mode = 2;
} 

function copyFile(source, target) {
    var rd = fs.createReadStream(source);
    var wr = fs.createWriteStream(target);
    return new Promise(function (resolve, reject) {
        rd.on('error', reject);
        wr.on('error', reject);
        wr.on('finish', resolve);
        rd.pipe(wr);
    }).catch(function (error) {
        rd.destroy();
        wr.end();
        throw error;
    });
}

files.forEach(file => {
    let stats = fs.lstatSync(file);
    const { mtime } = stats;
    const properties = [mtime.getFullYear(), (mtime.getMonth() + 1).toString().padStart(2, '0'), mtime.getDate().toString().padStart(2, '0')];
    let dir = [argument["--to"] || argument["--from"], ...properties.slice(0, mode)].join("\\");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const name = path.basename(file);
    copyFile(file, `${dir}\\${name}`);
    console.log(`Copy file ${name} to ${dir}`);
})