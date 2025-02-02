import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Switch,
  Button,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { Automation } from "../../types/automation";
import { automationService } from "../../services/automationService";

export const AutomationsList: React.FC = () => {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] =
    useState<Automation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    loadAutomations();
  }, [location.pathname]);

  const loadAutomations = async () => {
    try {
      const data = await automationService.getAllAutomations();
      setAutomations(data);
      setError(null);
    } catch (err) {
      setError("Failed to load automations");
      console.error("Error loading automations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (automation: Automation) => {
    try {
      const updated = await automationService.toggleAutomation(
        automation.id,
        !automation.enabled
      );
      setAutomations(
        automations.map((a) => (a.id === updated.id ? updated : a))
      );
    } catch (err) {
      console.error("Error toggling automation:", err);
    }
  };

  const handleEdit = (automation: Automation) => {
    navigate(`/automations/${automation.id}/edit`);
  };

  const handleDelete = async () => {
    if (!automationToDelete) return;

    try {
      await automationService.deleteAutomation(automationToDelete.id);
      setAutomations(automations.filter((a) => a.id !== automationToDelete.id));
      setDeleteDialogOpen(false);
      setAutomationToDelete(null);
    } catch (err) {
      console.error("Error deleting automation:", err);
    }
  };

  const confirmDelete = (automation: Automation) => {
    setAutomationToDelete(automation);
    setDeleteDialogOpen(true);
  };

  const filteredAutomations = automations.filter(
    (automation) =>
      automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      automation.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>Loading automations...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextField
          label="Search automations"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/automations/new")}
        >
          New Automation
        </Button>
      </Box>

      <Grid container spacing={3}>
        {filteredAutomations.map((automation) => (
          <Grid item xs={12} sm={6} md={4} key={automation.id}>
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  component="div"
                  className="automation-name"
                  gutterBottom
                >
                  {automation.name}
                </Typography>
                {automation.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {automation.description}
                  </Typography>
                )}
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    className="automation-version"
                  >
                    Version: {automation.version}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Last updated:{" "}
                    {new Date(automation.updated_at).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
              <CardActions
                sx={{ justifyContent: "space-between", px: 2, pb: 1 }}
              >
                <Switch
                  checked={automation.enabled}
                  onChange={() => handleToggle(automation)}
                  color="primary"
                />
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(automation)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => confirmDelete(automation)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Automation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{automationToDelete?.name}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
