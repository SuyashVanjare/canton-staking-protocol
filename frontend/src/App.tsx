import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Box,
  Paper,
  AppBar,
  Toolbar,
  Chip
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import PoolCard from './PoolCard';
import { PoolWithDetails, DelegationWithDetails, fetchAllPools, fetchUserDelegations, getLedgerParty } from './stakingService';
import DelegationCard from './DelegationCard'; // Assuming a DelegationCard component exists

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const App: React.FC = () => {
  const [pools, setPools] = useState<PoolWithDetails[]>([]);
  const [delegations, setDelegations] = useState<DelegationWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [party, setParty] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      // Don't reset data on refetch, just loading state
      setLoading(true);
      setError(null);
      const currentParty = getLedgerParty();
      setParty(currentParty);

      const [fetchedPools, fetchedDelegations] = await Promise.all([
        fetchAllPools(),
        fetchUserDelegations(currentParty),
      ]);

      setPools(fetchedPools);
      setDelegations(fetchedDelegations);
    } catch (err: any) {
      console.error("Failed to fetch staking data:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      setError(`Failed to connect to the ledger. Please check your JSON API connection and authentication token. Details: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateTotalStaked = () => {
    return delegations.reduce((total, d) => total + parseFloat(d.template.amount), 0).toFixed(4);
  };

  const calculateTotalRewards = () => {
    return delegations.reduce((total, d) => total + parseFloat(d.template.pendingRewards), 0).toFixed(4);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Canton Staking Protocol
          </Typography>
          {party && <Chip label={`User: ${party}`} variant="outlined" />}
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && pools.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Connecting to Ledger...</Typography>
          </Box>
        ) : (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 4, background: 'linear-gradient(45deg, #2a3a5b 30%, #3e5a8a 90%)' }}>
              <Typography variant="h5" gutterBottom>My Staking Summary</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" color="text.secondary">Total Staked</Typography>
                  <Typography variant="h4">{calculateTotalStaked()} TOK</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" color="text.secondary">Total Pending Rewards</Typography>
                  <Typography variant="h4" color="secondary.light">{calculateTotalRewards()} TOK</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Grid container spacing={4}>
              {/* Pools Section */}
              <Grid item xs={12} lg={8}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Available Validator Pools
                </Typography>
                <Grid container spacing={3}>
                  {pools.length > 0 ? (
                    pools.map(pool => (
                      <Grid item key={pool.contractId} xs={12} md={6}>
                        <PoolCard pool={pool} onActionSuccess={fetchData} />
                      </Grid>
                    ))
                  ) : (
                     !loading && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                          <Typography color="text.secondary">No validator pools found on the ledger.</Typography>
                        </Paper>
                      </Grid>
                     )
                  )}
                </Grid>
              </Grid>

              {/* Delegations Section */}
              <Grid item xs={12} lg={4}>
                <Typography variant="h5" component="h2" gutterBottom>
                  My Delegations
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {delegations.length > 0 ? (
                    delegations.map(delegation => (
                      <DelegationCard key={delegation.contractId} delegation={delegation} onActionSuccess={fetchData} />
                    ))
                  ) : (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">You have no active delegations.</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>Stake in a pool to get started.</Typography>
                    </Paper>
                  )}
                </Box>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default App;