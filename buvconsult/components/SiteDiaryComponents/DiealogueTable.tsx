import React, {useEffect, useState} from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import {Label} from "@/components/ui/label";
import {getSiteDiaryRecords, saveSiteDiaryRecords} from "@/app/siteDiaryActions";
import {SubmitButton} from "@/app/components/dashboard/SubmitButtons";
import { toast } from "sonner";


export function DialogTable({ date, siteId }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([
    {
      id: 1,
      date,
      location: "",
      works: "",
      units: "",
      amounts: "",
      workers: "",
      hours: "",
      comments: "",
    },
  ]);

  // Example options, replace as needed
  const locationOptions = ["Site A", "Site B", "Site C"];
  const workOptions = ["Excavation", "Concrete", "Finishing"];

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        date,
        location: "",
        works: "",
        units: "",
        amounts: "",
        workers: "",
        hours: "",
        comments: "",
      },
    ]);
  };

  const handleDeleteRow = (id) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const handleChange = (id, field, value) => {
    setRows((prev) =>
        prev.map((row) =>
            row.id === id ? {...row, [field]: value} : row
        )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await saveSiteDiaryRecords({
      rows,
      siteId: siteId  // from context
    });

    // Do what you want with the form data


    toast.success("Record saved!");
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true)


    if (!date || !siteId) {
      setRows([]);
      setLoading(false);
      return;
    }
    (async () => {
      const isoDate = typeof date === "string" ? date : date.toISOString();
      const loadedRows = await getSiteDiaryRecords({siteId, date: isoDate});
      if (!cancelled) {
        setRows(
            loadedRows.length
                ? loadedRows.map((row) => ({...row, id: row.id || Date.now() + Math.random()}))
                : [
                  {
                    id: Date.now(),
                    date,
                    location: "",
                    works: "",
                    units: "",
                    amounts: "",
                    workers: "",
                    hours: "",
                    comments: "",
                  },
                ]
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, siteId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        Loading...
      </div>
    );
  }

    return (
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <Card className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Works</TableHead>
                  <TableHead className="text-center">Units</TableHead>
                  <TableHead className="text-center">Amounts</TableHead>
                  <TableHead className="text-center">Workers</TableHead>
                  <TableHead className="text-center">Hours</TableHead>
                  <TableHead className="w-[1500px] text-center">Comments</TableHead>
                  <TableHead className="w-[500px] text-center">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.date
                            ? row.date.toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                            : "No date selected"}
                      </TableCell>
                      <TableCell>
                        <Select
                            value={row.location}
                            onValueChange={(val) =>
                                handleChange(row.id, "location", val)
                            }
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Select"/>
                          </SelectTrigger>
                          <SelectContent>
                            {locationOptions.map((opt) => (
                                <SelectItem value={opt} key={opt}>
                                  {opt}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                            value={row.works}
                            onValueChange={(val) =>
                                handleChange(row.id, "works", val)
                            }
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Select"/>
                          </SelectTrigger>
                          <SelectContent>
                            {workOptions.map((opt) => (
                                <SelectItem value={opt} key={opt}>
                                  {opt}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.units}
                            onChange={(e) =>
                                handleChange(row.id, "units", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.amounts}
                            onChange={(e) =>
                                handleChange(row.id, "amounts", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.workers}
                            onChange={(e) =>
                                handleChange(row.id, "workers", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                            type="text"
                            className="w-20"
                            value={row.hours}
                            onChange={(e) =>
                                handleChange(row.id, "hours", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Textarea
                            className="w-[500px] h-[75px]"
                            value={row.comments}
                            onChange={(e) =>
                                handleChange(row.id, "comments", e.target.value)
                            }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                        >
                          <Trash2 className="w-5 h-5"/>
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" onClick={handleAddRow} variant="outline">
              Add task
            </Button>
            <SubmitButton text="Save diary" onClick={handleSubmit} variant="default">

            </SubmitButton>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="username-1">Username</Label>
            <Input id="username-1" name="username" defaultValue="@peduarte"/>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="username-1">Username</Label>
            <Input id="username-1" name="username" defaultValue="@peduarte"/>
          </div>
        </form>
    );
  }
