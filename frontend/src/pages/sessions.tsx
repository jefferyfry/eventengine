import * as React from 'react';
import {ChangeEvent} from 'react';
import {alpha} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {visuallyHidden} from '@mui/utils';
import {Image} from 'mui-image'
import LogoutIcon from '@mui/icons-material/Logout';
import {
    AppBar,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    TextField
} from "@mui/material";
import LinkIcon from '@mui/icons-material/Link';
import {DesktopDatePicker} from "@mui/x-date-pickers";
import dayjs from 'dayjs';

const INSTANCE_TYPE_CUSTOM = "CUSTOM";
const INSTANCE_TYPE_DEFAULT = "DEFAULT";

interface Data {
    name: string;
    instanceType: string;
    lwUrl: string;
    lwSubAccount: string;
    lwAccessKeyID: string;
    lwSecretKey: string;
    lwUserGroup: string;
    createdBy: string;
    updatedBy: string;
    expiresAt: string;
    regCount: string;
    lwLink: string;
}

interface User {
    user: string;
    email: string;
}

const getSessions = async () => {
    const response = await fetch(process.env.REACT_APP_API_URL+"/api/sessions/", {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
    }

    const json = await response.json();

    console.log('result is: ', JSON.stringify(json, null, 4));

    if (json.length === 0) {
        return new Array<Data>();
    } else {
        return json as Data[];
    }
}

const getDefaultInstance = async () => {
    const response = await fetch(process.env.REACT_APP_API_URL+"/api/sessions/defaultinstance", {
        method: 'GET',
        headers: {
            Accept: 'application/text',
        },
    });

    if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
    }

    const url= await response.text();

    console.log('result is: ', url);

    if (url.length === 0) {
        return "error";
    } else {
        return url;
    }
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
): (
    a: { [key in Key]: number | string },
    b: { [key in Key]: number | string },
) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

// This method is created for cross-browser compatibility, if you don't
// need to support IE11, you can use Array.prototype.sort() directly
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) {
            return order;
        }
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

interface HeadCell {
    disablePadding: boolean;
    id: keyof Data;
    label: string;
    numeric: boolean;
}

const headCells: readonly HeadCell[] = [
    {
        id: 'name',
        numeric: false,
        disablePadding: true,
        label: 'Name',
    },
    {
        id: 'instanceType',
        numeric: false,
        disablePadding: true,
        label: 'Type',
    },
    {
        id: 'lwUrl',
        numeric: false,
        disablePadding: false,
        label: 'Lacework URL',
    },
    /*  {
          id: 'lwSubAccount',
          numeric: false,
          disablePadding: false,
          label: 'SubAccount',
      },*/
    {
        id: 'lwAccessKeyID',
        numeric: false,
        disablePadding: false,
        label: 'Access Key ID',
    },
    {
        id: 'lwSecretKey',
        numeric: false,
        disablePadding: false,
        label: 'Secret Key',
    },
    {
        id: 'lwUserGroup',
        numeric: false,
        disablePadding: false,
        label: 'User Group',
    },
    {
        id: 'expiresAt',
        numeric: false,
        disablePadding: false,
        label: 'Expires At',
    },
    {
        id: 'createdBy',
        numeric: false,
        disablePadding: false,
        label: 'Created By',
    },
    {
        id: 'updatedBy',
        numeric: false,
        disablePadding: false,
        label: 'Updated By',
    },
    {
        id: 'regCount',
        numeric: false,
        disablePadding: false,
        label: 'Reg Count',
    },
    {
        id: 'lwLink',
        numeric: false,
        disablePadding: false,
        label: 'Session Link',
    },
];

interface EnhancedTableProps {
    numSelected: number;
    onRequestSort: (event: React.MouseEvent<unknown>, property: keyof Data) => void;
    onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
    order: Order;
    orderBy: string;
    rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
    const {onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort} =
        props;
    const createSortHandler =
        (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
            onRequestSort(event, property);
        };

    return (
        <TableHead>
            <TableRow>
                <TableCell padding="checkbox">
                    <Checkbox
                        color="primary"
                        indeterminate={numSelected > 0 && numSelected < rowCount}
                        checked={rowCount > 0 && numSelected === rowCount}
                        onChange={onSelectAllClick}
                        inputProps={{
                            'aria-label': 'select all desserts',
                        }}
                    />
                </TableCell>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                        >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                                <Box component="span" sx={visuallyHidden}>
                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </Box>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

export default function EnhancedTable() {
    const [user, setUser] = React.useState("");
    const [add, setAdd] = React.useState(false);
    const [edit, setEdit] = React.useState(false);
    const [delet, setDelete] = React.useState(false);
    const [sessionName, setSessionName] = React.useState("");
    const [defaultInstance, setDefaultInstance] = React.useState("");
    const [instanceType, setInstanceType] = React.useState(INSTANCE_TYPE_DEFAULT);
    const [lwUrl, setSessionLwUrl] = React.useState("");
    const [lwSub, setSessionLwSub] = React.useState("");
    const [lwAccessKeyID, setSessionLwAccessKeyID] = React.useState("");
    const [lwSecretKey, setSessionLwSecretKey] = React.useState("");
    const [lwUserGroup, setSessionLwUserGroup] = React.useState("LACEWORK_USER_GROUP_READ_ONLY_USER");
    const [sessionExpires, setSessionExpires] = React.useState(dayjs().add(3,'day'));
    const [rows, setRows] = React.useState([] as Data[]);
    const [order, setOrder] = React.useState<Order>('asc');
    const [orderBy, setOrderBy] = React.useState<keyof Data>('name');
    const [selected, setSelected] = React.useState<string[]>([]);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);
    const [openAddSessionError, setOpenAddSessionError] = React.useState(false);
    const [addSessionError, setAddSessionError] = React.useState("");
    const [openEditSessionError, setOpenEditSessionError] = React.useState(false);
    const [editSessionError, setEditSessionError] = React.useState("");
    const [openDeleteSessionError, setOpenDeleteSessionError] = React.useState(false);
    const [deleteSessionError, setDeleteSessionError] = React.useState("");

    React.useEffect(() => {
        getSessions().then(function (data: Data[]) {
            setRows(data);
        });

        getDefaultInstance().then(function (data: string) {
            setDefaultInstance(data);
        });
    }, []);

    const addSession = async () => {
        const expiresAt = sessionExpires.toDate().toISOString();
        console.log({
            name: sessionName,
            instanceType: instanceType,
            lwUrl: lwUrl,
            lwSubAccount: lwSub,
            lwAccessKeyID: lwAccessKeyID,
            lwSecretKey: lwSecretKey,
            expiresAt: expiresAt
        })
        const response = await fetch(process.env.REACT_APP_API_URL+"/api/sessions/", {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
            body: JSON.stringify({
                name: sessionName,
                instanceType: instanceType,
                lwUrl: lwUrl,
                lwSubAccount: lwSub,
                lwAccessKeyID: lwAccessKeyID,
                lwSecretKey: lwSecretKey,
                lwUserGroup: lwUserGroup,
                createdBy: user,
                expiresAt: expiresAt
            })
        });

        if (!response.ok) {
            response.json().then((data) => {
                setAddSessionError(data.message);
                setOpenAddSessionError(true);
            })
        } else {
            getSessions().then(function (data: Data[]) {
                setRows(data);
                setAdd(false);
                setSessionName("")
                setInstanceType(INSTANCE_TYPE_DEFAULT)
                setSessionLwUrl("")
                setSessionLwSub("")
                setSessionLwAccessKeyID("")
                setSessionLwSecretKey("")
                setSessionLwUserGroup("LACEWORK_USER_GROUP_READ_ONLY_USER")
            });
        }
    }

    const updateSession = async () => {
        const expiresAt = sessionExpires.toDate().toISOString();
        console.log({
            name: sessionName,
            instanceType: instanceType,
            lwUrl: lwUrl,
            lwSubAccount: lwSub,
            lwAccessKeyID: lwAccessKeyID,
            lwSecretKey: lwSecretKey,
            lwUserGroup: lwUserGroup,
            expiresAt: expiresAt
        })
        const response = await fetch(process.env.REACT_APP_API_URL+"/api/sessions/" + sessionName, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
            },
            body: JSON.stringify({
                name: sessionName,
                instanceType: instanceType,
                lwUrl: lwUrl,
                lwSubAccount: lwSub,
                lwAccessKeyID: lwAccessKeyID,
                lwSecretKey: lwSecretKey,
                lwUserGroup: lwUserGroup,
                updatedBy: user,
                expiresAt: expiresAt
            })
        });

        if (!response.ok) {
            response.json().then((data) => {
                setEditSessionError(data.message);
                setOpenEditSessionError(true);
            })
        } else {
            getSessions().then(function (data: Data[]) {
                setRows(data);
                setEdit(false);
            });
        }
    }

    const deleteSessions = async (sessions: string[]) => {
        console.log({sessions: sessions})
        const response = await fetch(process.env.REACT_APP_API_URL+"/api/sessions/", {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
            },
            body: JSON.stringify({sessions: sessions})
        });

        if (!response.ok) {
            response.json().then((data) => {
                setDeleteSessionError(data.message);
                setOpenDeleteSessionError(true);
            })
        } else {
            setSelected([]);
            getSessions().then(function (data: Data[]) {
                setRows(data);
                setDelete(false);
            });
        }
    }

    const getLoggedInUser = async () => {
        const response = await fetch(process.env.REACT_APP_API_URL+"/oauth2/userinfo", {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });

        if (response.ok) {
            response.json().then((data:User) => {
                setUser(data.email);
            })
        } else {
            setUser("");
        }
    }

    const handleCancelAddSessionError = () => {
        setOpenAddSessionError(false);
        setAddSessionError("");
    }

    const handleCancelEditSessionError = () => {
        setOpenEditSessionError(false);
        setEditSessionError("");
    }

    const handleCancelDeleteSessionError = () => {
        setOpenDeleteSessionError(false);
        setDeleteSessionError("");
        getSessions().then(function (data: Data[]) {
            setRows(data);
            setDelete(false);
        });
    }

    const handleLaunchAdd = () => {
        setSessionName("")
        setInstanceType(INSTANCE_TYPE_DEFAULT)
        setSessionLwUrl("")
        setSessionLwSub("")
        setSessionLwAccessKeyID("")
        setSessionLwSecretKey("")
        setSessionLwUserGroup("LACEWORK_USER_GROUP_READ_ONLY_USER")
        setAdd(true);
    };

    const handleLogout = () => {
        window.open(window.location.origin + "/oauth2/sign_out?rd=%2Flogin","_self");
    };

    const handleCancelAdd = () => {
        setAdd(false);
    };

    const handleConfirmAdd = () => {
        addSession();
    };

    const handleLaunchEdit = () => {
        setEdit(true);
    };

    const handleCancelEdit = () => {
        setEdit(false);
    };

    const handleConfirmEdit = () => {
        updateSession();
    };

    const handleLaunchDelete = () => {
        setDelete(true);
    };

    const handleCancelDelete = () => {
        setDelete(false);
    };

    const handleConfirmDelete = () => {
        deleteSessions(selected);
    };

    const handleRequestSort = (
        event: React.MouseEvent<unknown>,
        property: keyof Data,
    ) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = rows.map((n) => n.name);
            setSelected(newSelected);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, name);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        if (newSelected.length === 1) {
            const row = rows.find((element, index, array) => {
                if (element.name === newSelected[0])
                    return true;
                else
                    return false;
            });
            if (row !== undefined) {
                setSessionName(row.name)
                setInstanceType(row.instanceType)
                setSessionLwUrl(row.lwUrl)
                setSessionLwSub(row.lwSubAccount)
                setSessionExpires(dayjs(row.expiresAt))
                setSessionLwAccessKeyID(row.lwAccessKeyID)
                setSessionLwSecretKey(row.lwSecretKey)
                setSessionLwUserGroup(row.lwUserGroup)
            }
        }

        setSelected(newSelected);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const isNameValid = (str: string) => {
        const regex = new RegExp("^[a-zA-Z0-9_]*$");
        return regex.test(str);
    };

    const isUrlValid = (str: string) => {
        const regex = new RegExp("^[a-zA-Z0-9.:/-]*$");

        return regex.test(str) && !str.endsWith("/") && !str.startsWith("https");
    };

    const onSessionNameChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value;
        if (isNameValid(value)) {
            setSessionName(value);
        }
    };

    const onSessionLwUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value;
        if (isUrlValid(value)) {
            setSessionLwUrl(value);
        }
    };

    const isSelected = (name: string) => selected.indexOf(name) !== -1;

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows =
        page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

    let numSelected = selected.length;

    getLoggedInUser();

    return (
        <Box sx={{width: '100%'}}>
            <AppBar position="static">
                <Toolbar variant="dense">
                    <Image src="/images/FortiCNAPP-200.png" width="50px" style={{padding: 10}}/>
                    <Typography variant="h5" color="inherit" component="div" sx={{flexGrow: 1}} style={{padding: 25}}>
                        Lacework FortiCNAPP Event Engine
                    </Typography>

                    <Typography variant="body2" color="inherit" component="div" style={{padding: 10}}>
                        {user.split("@")[0]}
                    </Typography>
                    <Tooltip title="Logout">
                        <IconButton onClick={handleLogout}>
                            <LogoutIcon/>
                        </IconButton>
                    </Tooltip>
                </Toolbar>
                <Typography variant="h6" color="inherit" component="div" sx={{flexGrow: 1}} style={{paddingLeft: 25}}>
                    Attendee self-provisioning for your Lacework FortiCNAPP events
                </Typography>
            </AppBar>
            <Paper sx={{width: '100%', mb: 2}}>
                <Toolbar
                    sx={{
                        pl: {sm: 2},
                        pr: {xs: 1, sm: 1},
                        ...(numSelected > 0 && {
                            bgcolor: (theme) =>
                                alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
                        }),
                    }}
                >
                    {numSelected > 0 ? (
                        <Typography
                            sx={{flex: '1 1 100%'}}
                            color="inherit"
                            variant="subtitle1"
                            component="div"
                        >
                            {numSelected} selected
                        </Typography>
                    ) : (
                        <Typography
                            sx={{flex: '1 1 100%'}}
                            variant="h6"
                            id="tableTitle"
                            component="div"
                        >
                            Sessions
                        </Typography>
                    )}
                    <Tooltip title="Edit">
                        <IconButton onClick={handleLaunchAdd}>
                            <AddIcon/>
                        </IconButton>
                    </Tooltip>
                    {numSelected === 1 ? (
                        <Tooltip title="Edit">
                            <IconButton onClick={handleLaunchEdit}>
                                <EditIcon/>
                            </IconButton>
                        </Tooltip>
                    ) : (null)}
                    {numSelected > 0 ? (
                        <Tooltip title="Delete">
                            <IconButton onClick={handleLaunchDelete}>
                                <DeleteIcon/>
                            </IconButton>
                        </Tooltip>
                    ) : (null)}
                    <div>
                        {/* AddSession Dialog */}
                        <Dialog open={add} onClose={handleCancelAdd}>
                            <DialogTitle>Add Session</DialogTitle>
                            <DialogContent>
                                <DialogContentText>
                                    Enter the session details and click Add.
                                </DialogContentText>
                                <FormControl>
                                    <RadioGroup
                                        aria-labelledby="type-buttons-group-label"
                                        defaultValue={INSTANCE_TYPE_DEFAULT}
                                        value={instanceType}
                                        name="radio-buttons-group"
                                        onChange={(event) => setInstanceType(event.target.value)}
                                    >
                                        <FormControlLabel value={INSTANCE_TYPE_CUSTOM} control={<Radio/>} label="CUSTOM"/>
                                        <FormControlLabel value={INSTANCE_TYPE_DEFAULT} control={<Radio/>} label={"DEFAULT "+defaultInstance}/>
                                    </RadioGroup>
                                </FormControl>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="sessionName"
                                    label="Name - Provide a unique name for your session."
                                    type="text"
                                    fullWidth
                                    value={sessionName}
                                    variant="standard"
                                    error={sessionName.length < 4}
                                    helperText={sessionName.length < 4 ? 'Min length > 3' : ''}
                                    onChange={onSessionNameChange}
                                />
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwUrl"
                                    style={{display: instanceType === INSTANCE_TYPE_DEFAULT ? 'none' : 'block'}}
                                    label="Lacework URL - Example: account.lacework.net"
                                    type="text"
                                    fullWidth
                                    value={lwUrl}
                                    variant="standard"
                                    error={lwUrl.length < 4}
                                    helperText={lwUrl.length < 4 ? 'Min length > 3' : ''}
                                    onChange={onSessionLwUrlChange}
                                />
                                {/* <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwSub"
                                    label="Lacework SubAccount"
                                    type="text"
                                    fullWidth
                                    variant="standard"
                                    onChange={(event)=>setSessionLwSub(event.target.value)}
                                />*/}
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwAccessKeyID"
                                    style={{display: instanceType === INSTANCE_TYPE_DEFAULT ? 'none' : 'block'}}
                                    label="AccessKeyID"
                                    type="text"
                                    fullWidth
                                    variant="standard"
                                    error={lwAccessKeyID.length < 4}
                                    helperText={lwAccessKeyID.length < 4 ? 'Min length > 3' : ''}
                                    onChange={(event) => setSessionLwAccessKeyID(event.target.value)}
                                />
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwSecretKey"
                                    style={{display: instanceType === INSTANCE_TYPE_DEFAULT ? 'none' : 'block'}}
                                    label="SecretKey"
                                    type="text"
                                    fullWidth
                                    variant="standard"
                                    error={lwSecretKey.length < 4}
                                    helperText={lwSecretKey.length < 4 ? 'Min length > 3' : ''}
                                    onChange={(event) => setSessionLwSecretKey(event.target.value)}
                                />
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwUserGroup"
                                    label="Add attendees to this user group guid"
                                    value={lwUserGroup}
                                    type="text"
                                    fullWidth
                                    variant="standard"
                                    error={lwUserGroup.length < 4}
                                    helperText={lwUserGroup.length < 4 ? 'Min length > 3' : ''}
                                    onChange={(event) => setSessionLwUserGroup(event.target.value)}
                                />

                                <DesktopDatePicker sx={{ marginTop: 5 }} label="Delete session on this date" value={sessionExpires} onChange={(val) => setSessionExpires(val!)}/>
                                <DialogContentText style={{marginTop: 5}}>
                                    The session will be deleted and users removed on this date.
                                </DialogContentText>
                                <Dialog open={openAddSessionError}>
                                    <DialogContent>
                                        <DialogContentText>
                                            {addSessionError}
                                        </DialogContentText>
                                    </DialogContent>
                                    <DialogActions>
                                        <Button variant="contained" onClick={handleCancelAddSessionError}>Ok</Button>
                                    </DialogActions>
                                </Dialog>
                            </DialogContent>
                            <DialogActions>
                                <Button variant="contained" onClick={handleCancelAdd}>Cancel</Button>
                                <Button variant="contained" onClick={handleConfirmAdd}>Add</Button>
                            </DialogActions>
                        </Dialog>
                        {/* EditSession Dialog */}
                        <Dialog open={edit} onClose={handleCancelEdit}>
                            <DialogTitle>Edit Session</DialogTitle>
                            <DialogContent>
                                <DialogContentText>
                                    Change the session details and click Update.
                                </DialogContentText>
                                <FormControl>
                                    <RadioGroup
                                        aria-labelledby="type-buttons-group-label"
                                        defaultValue={INSTANCE_TYPE_DEFAULT}
                                        value={instanceType}
                                        name="radio-buttons-group"
                                        onChange={(event) => setInstanceType(event.target.value)}
                                    >
                                        <FormControlLabel value={INSTANCE_TYPE_CUSTOM} control={<Radio/>} label="CUSTOM"/>
                                        <FormControlLabel value={INSTANCE_TYPE_DEFAULT} control={<Radio/>} label={"DEFAULT "+defaultInstance}/>
                                    </RadioGroup>
                                </FormControl>
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="sessionName"
                                    label="Name - Provide a unique name for your session."
                                    type="text"
                                    disabled={true}
                                    value={sessionName}
                                    fullWidth
                                    variant="standard"
                                />
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwUrl"
                                    style={{display: instanceType === INSTANCE_TYPE_DEFAULT ? 'none' : 'block'}}
                                    label="Lacework URL - Example: account.lacework.net"
                                    type="text"
                                    fullWidth
                                    value={lwUrl}
                                    variant="standard"
                                    error={lwUrl.length < 4}
                                    helperText={lwUrl.length < 4 ? 'Min length > 3' : ''}
                                    onChange={onSessionLwUrlChange}
                                />
                                {/*<TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwSub"
                                    label="Lacework SubAccount"
                                    type="text"
                                    value={lwSub}
                                    fullWidth
                                    variant="standard"
                                    onChange={(event)=>setSessionLwSub(event.target.value)}
                                />*/}
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwAccessKeyID"
                                    style={{display: instanceType === INSTANCE_TYPE_DEFAULT ? 'none' : 'block'}}
                                    label="AccessKeyID"
                                    type="text"
                                    value={lwAccessKeyID}
                                    fullWidth
                                    variant="standard"
                                    error={lwAccessKeyID.length < 4}
                                    helperText={lwAccessKeyID.length < 4 ? 'Min length > 3' : ''}
                                    onChange={(event) => setSessionLwAccessKeyID(event.target.value)}
                                />
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwSecretKey"
                                    style={{display: instanceType === INSTANCE_TYPE_DEFAULT ? 'none' : 'block'}}
                                    label="SecretKey"
                                    type="text"
                                    value={lwSecretKey}
                                    fullWidth
                                    variant="standard"
                                    error={lwSecretKey.length < 4}
                                    helperText={lwSecretKey.length < 4 ? 'Min length > 3' : ''}
                                    onChange={(event) => setSessionLwSecretKey(event.target.value)}
                                />
                                <TextField
                                    autoFocus
                                    margin="dense"
                                    id="lwUserGroup"
                                    label="Add attendees to this user group guid"
                                    type="text"
                                    value={lwUserGroup}
                                    fullWidth
                                    variant="standard"
                                    error={lwUserGroup.length < 4}
                                    helperText={lwUserGroup.length < 4 ? 'Min length > 3' : ''}
                                    onChange={(event) => setSessionLwUserGroup(event.target.value)}
                                />
                                <DesktopDatePicker sx={{ marginTop: 5 }} label="Delete session on this date" value={sessionExpires} onChange={(val) => setSessionExpires(val!)}/>
                                <Dialog open={openEditSessionError}>
                                    <DialogContent>
                                        <DialogContentText>
                                            {editSessionError}
                                        </DialogContentText>
                                    </DialogContent>
                                    <DialogActions>
                                        <Button variant="contained" onClick={handleCancelEditSessionError}>Ok</Button>
                                    </DialogActions>
                                </Dialog>
                            </DialogContent>
                            <DialogActions>
                                <Button variant="contained" onClick={handleCancelEdit}>Cancel</Button>
                                <Button variant="contained" onClick={handleConfirmEdit}>Update</Button>
                            </DialogActions>
                        </Dialog>

                        {/* Delete Dialog */}
                        <Dialog
                            open={delet}
                            onClose={handleCancelDelete}
                            aria-labelledby="delete-dialog-title"
                            aria-describedby="delete-dialog-description"
                        >
                            <DialogTitle id="delete-dialog-title">
                                Delete Session
                            </DialogTitle>
                            <DialogContent>
                                <DialogContentText id="delete-dialog-description">
                                    {numSelected > 1 ? "Are you sure that you want to delete these sessions?" : "Are you sure that you want to delete this session?"}
                                </DialogContentText>
                            </DialogContent>
                            <Dialog open={openDeleteSessionError}>
                                <DialogContent>
                                    <DialogContentText>
                                        {deleteSessionError}
                                    </DialogContentText>
                                </DialogContent>
                                <DialogActions>
                                    <Button variant="contained" onClick={handleCancelDeleteSessionError}>Ok</Button>
                                </DialogActions>
                            </Dialog>
                            <DialogActions>
                                <Button variant="contained" onClick={handleCancelDelete} autoFocus>Cancel</Button>
                                <Button variant="contained" onClick={handleConfirmDelete}>
                                    Delete
                                </Button>
                            </DialogActions>
                        </Dialog>
                    </div>
                </Toolbar>
                <TableContainer>
                    <Table
                        sx={{minWidth: 750}}
                        aria-labelledby="tableTitle"
                        size={'medium'}
                    >
                        <EnhancedTableHead
                            numSelected={selected.length}
                            order={order}
                            orderBy={orderBy}
                            onSelectAllClick={handleSelectAllClick}
                            onRequestSort={handleRequestSort}
                            rowCount={rows.length}
                        />
                        <TableBody>
                            {/* if you don't need to support IE11, you can replace the `stableSort` call with:
              rows.slice().sort(getComparator(order, orderBy)) */}
                            {stableSort(rows, getComparator(order, orderBy))
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((row, index) => {
                                    const isItemSelected = isSelected(row.name);
                                    const labelId = `enhanced-table-checkbox-${index}`;

                                    return (
                                        <TableRow
                                            hover
                                            onClick={(event) => handleClick(event, row.name)}
                                            role="checkbox"
                                            aria-checked={isItemSelected}
                                            tabIndex={-1}
                                            key={row.name}
                                            selected={isItemSelected}
                                        >
                                            <TableCell padding="checkbox" width="5%">
                                                <Checkbox
                                                    color="primary"
                                                    checked={isItemSelected}
                                                    inputProps={{
                                                        'aria-labelledby': labelId,
                                                    }}
                                                />
                                            </TableCell>
                                            <Tooltip title={row.name}>
                                                <TableCell
                                                    component="th"
                                                    id={labelId}
                                                    scope="row"
                                                    padding="none"
                                                    width="10%"
                                                    align="left"
                                                >
                                                    {row.name.slice(0, 7) + "..."}
                                                </TableCell>
                                            </Tooltip>
                                            <TableCell
                                                component="th"
                                                id={labelId}
                                                scope="row"
                                                padding="none"
                                                width="10%"
                                                align="left"
                                            >
                                                {row.instanceType}
                                            </TableCell>
                                            <Tooltip title={row.lwUrl}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="15%"
                                                           align="left">{row.instanceType === INSTANCE_TYPE_DEFAULT?defaultInstance:row.lwUrl.slice(0, 7) + "..."}
                                                </TableCell>
                                            </Tooltip>
                                            {/*<TableCell component="th"
                                                       id={labelId}
                                                       scope="row"
                                                       padding="none"
                                                       width="10%">{row.lwSubAccount}</TableCell>*/}
                                            <Tooltip title={row.lwAccessKeyID}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="10%"
                                                           align="left">{row.lwAccessKeyID.slice(0, 7) + "..."}
                                                </TableCell>
                                            </Tooltip>
                                            <Tooltip title={row.lwSecretKey}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="10%"
                                                           align="left">{row.lwSecretKey.slice(0, 7) + "..."}
                                                </TableCell>
                                            </Tooltip>
                                            <Tooltip title={row.lwUserGroup}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="10%"
                                                           align="left">{row.lwUserGroup.slice(0, 7) + "..."}
                                                </TableCell>
                                            </Tooltip>
                                            <Tooltip title={row.expiresAt}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="15%"
                                                           align="left">{(new Date(row.expiresAt)).toLocaleString().split(",")[0]}
                                                </TableCell>
                                            </Tooltip>
                                            <Tooltip title={row.createdBy}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="15%"
                                                           align="left">{row.createdBy.split("@")[0]}
                                                </TableCell>
                                            </Tooltip>
                                            <Tooltip title={row.updatedBy}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="15%"
                                                           align="left">{row.updatedBy.split("@")[0]}
                                                </TableCell>
                                            </Tooltip>
                                            <Tooltip title={row.regCount}>
                                                <TableCell component="th"
                                                           id={labelId}
                                                           scope="row"
                                                           padding="none"
                                                           width="10%"
                                                           align="center">{row.regCount}
                                                </TableCell>
                                            </Tooltip>
                                            <TableCell component="th"
                                                       id={labelId}
                                                       scope="row"
                                                       padding="none">
                                                <Tooltip title="Test session link">
                                                    <IconButton onClick={() => {
                                                        window.open(window.location.origin + "/event/" + row.name, '_blank');
                                                    }}>
                                                        <LinkIcon/>
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Copy">
                                                    <IconButton onClick={() => {
                                                        navigator.clipboard.writeText(window.location.origin + "/event/" + row.name)
                                                    }}>
                                                        <ContentCopyIcon/>
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            {emptyRows > 0 && (
                                <TableRow
                                    style={{
                                        height: 53 * emptyRows,
                                    }}
                                >
                                    <TableCell colSpan={6}/>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={rows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </Box>
    );
}


